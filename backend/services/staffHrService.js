const supabase = require('../config/supabase');
const { httpErr, toApi, UUID, validDate } = require('./crudFactory');
const { notifyAdmins } = require('../utils/notify');

// Every call resolves the employee from the JWT identity only; nothing here
// accepts an employee id from the client.
const myEmployee = async (user) => {
  const { data } = await supabase.from('employees').select('id, full_name, employee_code').eq('user_id', user.id).eq('org_id', user.orgId).maybeSingle();
  return data || null;
};
const needEmployee = async (user) => {
  const e = await myEmployee(user);
  if (!e) throw httpErr('Your employee profile has not been created yet. Please contact your administrator.', 404);
  return e;
};
const fail = (e, msg) => { if (e) { console.error('[staffHr]', e.message); throw httpErr(msg, 500); } };

const GOAL_STATUSES = ['Not Started', 'In Progress', 'Completed'];

const myGoals = async ({ user }) => {
  const e = await myEmployee(user);
  if (!e) return [];
  const { data, error } = await supabase.from('performance_goals').select('*').eq('org_id', user.orgId).eq('employee_id', e.id).order('due_date', { ascending: true, nullsFirst: false }).limit(200);
  fail(error, 'Could not load your goals.');
  return data.map(toApi);
};

const updateMyGoal = async ({ user, id, body = {} }) => {
  if (!UUID.test(id || '')) throw httpErr('Invalid goal.');
  const e = await needEmployee(user);
  const { data: before } = await supabase.from('performance_goals').select('*').eq('id', id).eq('org_id', user.orgId).eq('employee_id', e.id).maybeSingle();
  if (!before) throw httpErr('Goal not found.', 404);
  if (before.status === 'Cancelled') throw httpErr('This goal was cancelled and can no longer be updated.', 409);
  const patch = {};
  if (body.status !== undefined) {
    if (!GOAL_STATUSES.includes(body.status)) throw httpErr(`Status must be one of: ${GOAL_STATUSES.join(', ')}.`);
    patch.status = body.status;
  }
  if (body.progress !== undefined) {
    const n = Number(body.progress);
    if (!Number.isInteger(n) || n < 0 || n > 100) throw httpErr('Progress must be a whole number from 0 to 100.');
    patch.progress = n;
  }
  if (!Object.keys(patch).length) throw httpErr('Nothing to update.');
  if (patch.status !== undefined && patch.progress === undefined) {
    if (patch.status === 'Not Started') patch.progress = 0;
    else if (patch.status === 'Completed') patch.progress = 100;
    else if (before.progress >= 100) patch.progress = 99;
  }
  const { data, error } = await supabase.from('performance_goals').update(patch).eq('id', id).eq('org_id', user.orgId).eq('employee_id', e.id).select().maybeSingle();
  fail(error, 'Could not update the goal.');
  if (!data) throw httpErr('Goal not found.', 404);
  if (data.status !== before.status) {
    await notifyAdmins(user.orgId, 'Goal Status Updated', `${e.full_name} marked “${data.title}” as ${data.status}.`, { dedupe_key: `goal:status:${data.id}:${data.status}:${Date.now()}` });
  }
  return toApi(data);
};

const myReviews = async ({ user }) => {
  const e = await myEmployee(user);
  if (!e) return [];
  const { data, error } = await supabase.from('performance_reviews').select('id, period_label, rating, strengths, improvements, status, created_at, updated_at').eq('org_id', user.orgId).eq('employee_id', e.id).in('status', ['Submitted', 'Acknowledged']).order('created_at', { ascending: false }).limit(50);
  fail(error, 'Could not load your reviews.');
  return data.map(toApi);
};

const acknowledgeReview = async ({ user, id }) => {
  if (!UUID.test(id || '')) throw httpErr('Invalid review.');
  const e = await needEmployee(user);
  const { data, error } = await supabase.from('performance_reviews').update({ status: 'Acknowledged' }).eq('id', id).eq('org_id', user.orgId).eq('employee_id', e.id).eq('status', 'Submitted').select().maybeSingle();
  fail(error, 'Could not acknowledge the review.');
  if (!data) throw httpErr('Review not found or already acknowledged.', 404);
  return toApi(data);
};

const myFeedback = async ({ user }) => {
  const e = await myEmployee(user);
  if (!e) return [];
  const { data, error } = await supabase.from('performance_feedback').select('id, message, given_by, created_at').eq('org_id', user.orgId).eq('employee_id', e.id).order('created_at', { ascending: false }).limit(50);
  fail(error, 'Could not load your feedback.');
  const ids = [...new Set(data.map((x) => x.given_by).filter(Boolean))];
  const names = new Map();
  if (ids.length) {
    const { data: us } = await supabase.from('users').select('id, full_name').eq('org_id', user.orgId).in('id', ids);
    (us || []).forEach((u) => names.set(u.id, u.full_name));
  }
  return data.map((x) => ({ id: x.id, message: x.message, createdAt: x.created_at, givenBy: names.get(x.given_by) || 'Admin' }));
};

const myTraining = async ({ user }) => {
  const e = await myEmployee(user);
  const { data: progs, error } = await supabase.from('training_programs').select('*').eq('org_id', user.orgId).in('status', ['Planned', 'Ongoing']).order('start_date', { ascending: true, nullsFirst: false }).limit(100);
  fail(error, 'Could not load training programs.');
  let enr = [], ints = [];
  if (e) {
    [{ data: enr }, { data: ints }] = await Promise.all([
      supabase.from('training_enrollments').select('program_id, status, score').eq('org_id', user.orgId).eq('employee_id', e.id),
      supabase.from('training_interests').select('program_id').eq('org_id', user.orgId).eq('employee_id', e.id)
    ]);
  }
  const em = new Map((enr || []).map((x) => [x.program_id, x]));
  const im = new Set((ints || []).map((x) => x.program_id));
  const open = progs.map((p) => ({
    id: p.id, title: p.title, description: p.description, provider: p.provider, startDate: p.start_date, endDate: p.end_date,
    capacity: p.capacity, status: p.status, interested: im.has(p.id), enrollmentStatus: em.get(p.id)?.status || null
  }));
  // programs the employee is in that have since finished still show their result
  const openIds = new Set(progs.map((p) => p.id));
  const extra = (enr || []).filter((x) => !openIds.has(x.program_id));
  if (extra.length) {
    const { data: done } = await supabase.from('training_programs').select('id, title, provider, start_date, end_date, status').eq('org_id', user.orgId).in('id', extra.map((x) => x.program_id));
    (done || []).forEach((p) => open.push({ id: p.id, title: p.title, provider: p.provider, startDate: p.start_date, endDate: p.end_date, status: p.status, interested: false, enrollmentStatus: em.get(p.id).status, score: em.get(p.id).score }));
  }
  return open;
};

const setInterest = async ({ user, programId, interested }) => {
  if (!UUID.test(programId || '')) throw httpErr('Invalid program.');
  const e = await needEmployee(user);
  const { data: p } = await supabase.from('training_programs').select('id, title, status').eq('id', programId).eq('org_id', user.orgId).maybeSingle();
  if (!p) throw httpErr('Program not found.', 404);
  if (!interested) {
    await supabase.from('training_interests').delete().eq('org_id', user.orgId).eq('program_id', programId).eq('employee_id', e.id);
    return { interested: false };
  }
  if (!['Planned', 'Ongoing'].includes(p.status)) throw httpErr('This program is no longer open.', 409);
  const { data: enrolled } = await supabase.from('training_enrollments').select('id').eq('org_id', user.orgId).eq('program_id', programId).eq('employee_id', e.id).neq('status', 'Dropped').maybeSingle();
  if (enrolled) throw httpErr('You are already enrolled in this program.', 409);
  const { error } = await supabase.from('training_interests').insert({ org_id: user.orgId, program_id: programId, employee_id: e.id });
  if (error && error.code !== '23505') fail(error, 'Could not save your interest.');
  if (!error) await notifyAdmins(user.orgId, 'Training Interest', `${e.full_name} is interested in “${p.title}”.`, { dedupe_key: `training:interest:${programId}:${e.id}` });
  return { interested: true };
};

const myBenefits = async ({ user }) => {
  const e = await myEmployee(user);
  if (!e) return { items: [], monthlyAllowance: 0 };
  const { data, error } = await supabase.from('employee_benefits').select('id, plan_id, start_date, end_date, status').eq('org_id', user.orgId).eq('employee_id', e.id).order('start_date', { ascending: false }).limit(100);
  fail(error, 'Could not load your benefits.');
  const ids = [...new Set(data.map((x) => x.plan_id))];
  const plans = new Map();
  if (ids.length) {
    const { data: ps } = await supabase.from('benefit_plans').select('id, name, kind, description, amount').eq('org_id', user.orgId).in('id', ids);
    (ps || []).forEach((p) => plans.set(p.id, p));
  }
  const items = data.map((b) => {
    const p = plans.get(b.plan_id) || {};
    return { id: b.id, name: p.name || 'Benefit', kind: p.kind || 'Benefit', description: p.description || null, amount: Number(p.amount || 0), startDate: b.start_date, endDate: b.end_date, status: b.status };
  });
  const monthlyAllowance = items.filter((i) => i.status === 'Active' && i.kind === 'Allowance').reduce((s, i) => s + i.amount, 0);
  return { items, monthlyAllowance };
};

module.exports = { myGoals, updateMyGoal, myReviews, acknowledgeReview, myFeedback, myTraining, setInterest, myBenefits, validDate };
