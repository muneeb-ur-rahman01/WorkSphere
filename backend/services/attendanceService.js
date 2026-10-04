const supabase = require('../config/supabase');

const STAFF_ROLES = ['Employee', 'Intern', 'Volunteer', 'Membership', 'Executive Director'];
const DEFAULT_POLICY = { timezone: 'Asia/Karachi', weekend_days: [0, 6] };
const PRESENT_STATES = ['Present', 'Late', 'Half Day', 'Incomplete'];

const httpErr = (message, statusCode) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const serializeSession = (s) =>
  s && {
    id: s.id,
    userId: s.user_id,
    workDate: s.work_date,
    checkInAt: s.check_in_at,
    checkOutAt: s.check_out_at,
    durationSeconds: s.duration_seconds,
    status: s.status,
    isCorrected: s.is_corrected,
    correctionNote: s.correction_note
  };

const getPolicy = async (orgId) => {
  const { data } = await supabase.from('attendance_settings').select('*').eq('org_id', orgId).maybeSingle();
  return { ...DEFAULT_POLICY, ...(data || {}) };
};

const dbNow = async () => {
  const { data, error } = await supabase.rpc('ws_now');
  return !error && data ? new Date(data).toISOString() : new Date().toISOString();
};

const todayIn = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

const monthBounds = (month) => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, '0');
  return { first: `${y}-${pad(m)}-01`, last: `${y}-${pad(m)}-${pad(last)}` };
};

const rpcError = (error, fallback) => {
  const msg = error?.message || '';
  if (/not active/i.test(msg)) return httpErr('Your account is not active in this organization.', 403);
  if (/no attendance session/i.test(msg)) return httpErr('You have not checked in yet.', 409);
  return httpErr(fallback, 500);
};

// ---------- staff (self) ----------

const getToday = async ({ user }) => {
  const policy = await getPolicy(user.orgId);
  const today = todayIn(policy.timezone);
  const { data: latest, error } = await supabase
    .from('attendance_sessions').select('*').eq('user_id', user.id)
    .order('check_in_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw httpErr('Could not load attendance.', 500);

  let state = 'not_checked_in';
  let session = null;
  if (latest && latest.work_date === today) {
    session = latest;
    state = latest.check_out_at ? 'checked_out' : 'checked_in';
  }
  return {
    serverNow: await dbNow(),
    timezone: policy.timezone,
    today,
    state,
    session: serializeSession(session),
    staleOpenSession: !!(latest && !latest.check_out_at && latest.work_date < today)
  };
};

const checkIn = async ({ user }) => {
  const { data, error } = await supabase.rpc('ws_attendance_check_in', { p_user: user.id, p_org: user.orgId });
  if (error) throw rpcError(error, 'Could not check in.');
  return serializeSession(data);
};

const checkOut = async ({ user }) => {
  const { data, error } = await supabase.rpc('ws_attendance_check_out', { p_user: user.id, p_org: user.orgId });
  if (error) throw rpcError(error, 'Could not check out.');
  return serializeSession(data);
};

const monthFor = async (orgId, userId, month) => {
  const policy = await getPolicy(orgId);
  const m = month || todayIn(policy.timezone).slice(0, 7);
  const { first, last } = monthBounds(m);
  const [sessions, days] = await Promise.all([
    supabase.from('attendance_sessions').select('*').eq('user_id', userId).eq('org_id', orgId)
      .gte('work_date', first).lte('work_date', last).order('work_date', { ascending: false }),
    supabase.rpc('ws_month_attendance', { p_user: userId, p_org: orgId, p_month: first })
  ]);
  if (sessions.error || days.error) throw httpErr('Could not load attendance.', 500);

  const totals = { present: 0, absent: 0, leave: 0, late: 0, halfDay: 0, incomplete: 0, weekend: 0, upcoming: 0 };
  let workedSeconds = 0;
  for (const d of days.data) {
    if (PRESENT_STATES.includes(d.state)) totals.present++;
    if (d.state === 'Absent') totals.absent++;
    if (d.state === 'Leave') totals.leave++;
    if (d.state === 'Late') totals.late++;
    if (d.state === 'Half Day') totals.halfDay++;
    if (d.state === 'Incomplete') totals.incomplete++;
    if (d.state === 'Weekend') totals.weekend++;
    if (d.state === 'Upcoming') totals.upcoming++;
    workedSeconds += d.worked_seconds || 0;
  }
  return {
    month: m,
    sessions: sessions.data.map(serializeSession),
    days: days.data.map((d) => ({ date: d.day, state: d.state, workedSeconds: d.worked_seconds })),
    totals: { ...totals, workedSeconds }
  };
};

const getMine = ({ user, month }) => monthFor(user.orgId, user.id, month);

// ---------- OrgAdmin ----------

const listOrgDay = async ({ user, date }) => {
  const policy = await getPolicy(user.orgId);
  const day = date || todayIn(policy.timezone);
  const [staff, sessions, leaves] = await Promise.all([
    supabase.from('users').select('id, full_name, role').eq('org_id', user.orgId).eq('status', 'Active').in('role', STAFF_ROLES).order('full_name'),
    supabase.from('attendance_sessions').select('*').eq('org_id', user.orgId).eq('work_date', day),
    supabase.from('leave_requests').select('user_id').eq('org_id', user.orgId).eq('status', 'Approved').lte('start_date', day).gte('end_date', day)
  ]);
  if (staff.error || sessions.error || leaves.error) throw httpErr('Could not load attendance.', 500);

  const byUser = new Map(sessions.data.map((s) => [s.user_id, s]));
  const onLeave = new Set(leaves.data.map((l) => l.user_id));
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  const isWeekend = (policy.weekend_days || []).includes(dow);
  const isFuture = day > todayIn(policy.timezone);

  const rows = staff.data.map((u) => {
    const s = byUser.get(u.id);
    let state;
    if (onLeave.has(u.id)) state = 'Leave';
    else if (s) state = s.status;
    else if (isWeekend) state = 'Weekend';
    else if (isFuture) state = 'Upcoming';
    else state = 'Absent';
    return { userId: u.id, fullName: u.full_name, role: u.role, state, session: serializeSession(s) };
  });
  return { date: day, timezone: policy.timezone, rows };
};

const getUserMonth = async ({ user, targetUserId, month }) => {
  const { data: target } = await supabase.from('users').select('id, full_name').eq('id', targetUserId).eq('org_id', user.orgId).maybeSingle();
  if (!target) throw httpErr('Staff member not found.', 404);
  const result = await monthFor(user.orgId, target.id, month);
  return { ...result, user: { id: target.id, fullName: target.full_name } };
};

const adminCorrect = async ({ user, id, checkInAt, checkOutAt, status, reason }) => {
  const { data, error } = await supabase.rpc('ws_attendance_admin_correct', {
    p_session: id, p_org: user.orgId, p_admin: user.id,
    p_check_in: checkInAt || null, p_check_out: checkOutAt || null, p_status: status || null, p_reason: reason
  });
  if (error) {
    if (/not found/i.test(error.message)) throw httpErr('Attendance record not found.', 404);
    if (/chk_attendance_out_after_in/.test(error.message)) throw httpErr('Check-out cannot be before check-in.', 400);
    throw httpErr('Could not correct attendance.', 500);
  }
  await supabase.from('notifications').insert({
    org_id: user.orgId, title: 'Attendance Updated',
    message: `An administrator corrected your attendance for ${data.work_date}. Reason: ${reason.slice(0, 150)}`,
    type: 'GeneralAlert', target_role: 'All', target_user_id: data.user_id,
    dedupe_key: `att-corr:${data.id}:${Date.now()}`
  });
  return serializeSession(data);
};

module.exports = { STAFF_ROLES, getToday, checkIn, checkOut, getMine, listOrgDay, getUserMonth, adminCorrect };
