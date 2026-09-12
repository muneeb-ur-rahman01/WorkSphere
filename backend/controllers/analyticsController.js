const supabase = require('../config/supabase');
const { VALID_RANGES, getBuckets, countInRange, countBefore, countByKey } = require('../utils/analytics');

const STAFF_ROLES = ['Employee', 'Intern', 'Volunteer', 'Membership', 'Executive Director'];

// Every extra module that should get its own weekly/monthly/yearly trend
// line and KPI card, beyond the original Camps/Events/Users/Tasks set.
// table: the Supabase table to pull from. key: the field name used in the
// trend/kpi objects below (e.g. trend[i].projects, kpis.totalProjects).
// amountField: optional — when set, also sums that numeric column per
// bucket (e.g. donation amounts) alongside the plain row count.
const EXTRA_MODULES = [
  { key: 'meetings', table: 'meetings' },
  { key: 'opportunities', table: 'opportunities' },
  { key: 'projects', table: 'projects' },
  { key: 'campaigns', table: 'campaigns' },
  { key: 'donors', table: 'donors' },
  { key: 'donations', table: 'donations', amountField: 'amount' },
  { key: 'sponsors', table: 'sponsors' },
  { key: 'sponsorships', table: 'sponsorships', amountField: 'amount' },
  { key: 'partners', table: 'partners' },
  { key: 'beneficiaries', table: 'beneficiaries' },
  { key: 'expenses', table: 'expenses', amountField: 'amount' },
  { key: 'documents', table: 'documents' }
];

// GET /api/analytics/org?range=weekly|monthly|yearly  (OrgAdmin)
// Everything is scoped to the calling admin's own organization.
const getOrgAnalytics = async (req, res) => {
  console.log('🔥🔥🔥 NEW ANALYTICS CONTROLLER RUNNING 🔥🔥🔥');
  console.log('🔥 GET ORG ANALYTICS CONTROLLER HIT');

  const range = VALID_RANGES.includes(req.query.range)
    ? req.query.range
    : 'weekly';

  const orgId = req.user.orgId;

  console.log('🔥 Analytics params:', {
    range,
    orgId
  });

  const [campsRes, eventsRes, usersRes, tasksRes, ...extraRes] =
    await Promise.all([
      supabase
        .from('camps')
        .select('id, status, created_at')
        .eq('org_id', orgId),

      supabase
        .from('events')
        .select('id, status, event_type, created_at')
        .eq('org_id', orgId),

      supabase
        .from('users')
        .select('id, role, status, created_at')
        .eq('org_id', orgId),

      supabase
        .from('tasks')
        .select('id, status, created_at')
        .eq('org_id', orgId),

      ...EXTRA_MODULES.map((m) =>
        supabase
          .from(m.table)
          .select(
            `id, created_at${m.amountField ? `, ${m.amountField}` : ''}`
          )
          .eq('org_id', orgId)
      )
    ]);

  console.log('🔥 ANALYTICS QUERY RESULTS:', {
    campsError: campsRes.error,
    eventsError: eventsRes.error,
    usersError: usersRes.error,
    tasksError: tasksRes.error,
    extraErrors: extraRes.map((result, index) => ({
      module: EXTRA_MODULES[index]?.key,
      table: EXTRA_MODULES[index]?.table,
      error: result.error
    }))
  });

  const err =
    campsRes.error ||
    eventsRes.error ||
    usersRes.error ||
    tasksRes.error ||
    extraRes.find((result) => result.error)?.error;

  if (err) {
    console.error('🔥 ANALYTICS SUPABASE ERROR:', err);

    return res.status(500).json({
      success: false,
      error: err.message || 'Could not load analytics.'
    });
  }

  // baaki tumhara existing code yahan se continue hoga...

  // const err = campsRes.error || eventsRes.error || usersRes.error || tasksRes.error || extraRes.find((r) => r.error)?.error;
  // if (err) return res.status(500).json({ success: false, error: 'Could not load analytics.' });

  const camps = campsRes.data;
  const events = eventsRes.data;
  const staff = usersRes.data.filter((u) => u.role !== 'OrgAdmin');
  const tasks = tasksRes.data;

  // { projects: [...rows], donations: [...rows], ... }
  const extraData = Object.fromEntries(EXTRA_MODULES.map((m, i) => [m.key, extraRes[i].data]));

  const buckets = getBuckets(range);
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const trend = buckets.map((b) => {
    const row = {
      label: b.label,
      events: countInRange(events, b.start, b.end),
      camps: countInRange(camps, b.start, b.end),
      newUsers: countInRange(staff, b.start, b.end),
      totalUsers: countBefore(staff, b.end)
    };
    EXTRA_MODULES.forEach((m) => {
      row[m.key] = countInRange(extraData[m.key], b.start, b.end);
      if (m.amountField) {
        row[`${m.key}Amount`] = extraData[m.key]
          .filter((r) => {
            const d = new Date(r.created_at);
            return d >= b.start && d < b.end;
          })
          .reduce((s, r) => s + Number(r[m.amountField] || 0), 0);
      }
    });
    return row;
  });

  const periodEvents = trend.reduce((s, t) => s + t.events, 0);
  const periodCamps = trend.reduce((s, t) => s + t.camps, 0);
  const periodNewUsers = trend.reduce((s, t) => s + t.newUsers, 0);

  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;

  const kpis = {
    totalCamps: camps.length,
    totalEvents: events.length,
    totalUsers: staff.length,
    activeUsers: staff.filter((u) => u.status === 'Active').length,
    pendingUsers: staff.filter((u) => u.status === 'Pending').length,
    upcomingCamps: camps.filter((c) => c.status === 'Upcoming').length,
    upcomingEvents: events.filter((e) => e.status === 'Upcoming').length,
    completedCamps: camps.filter((c) => c.status === 'Completed').length,
    completedEvents: events.filter((e) => e.status === 'Completed').length,
    totalTasks: tasks.length,
    completedTasks,
    taskCompletionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
    periodEvents,
    periodCamps,
    periodNewUsers
  };

  // Totals + period sums for every extra module (Meetings, Opportunities,
  // Projects, Campaigns, Donors, Donations, Sponsors, Sponsorships,
  // Partners, Beneficiaries, Expenses, Documents), so the same
  // Weekly/Monthly/Yearly range switcher that drives Camps/Events/Users
  // also drives these — e.g. kpis.totalProjects, kpis.periodProjects,
  // kpis.totalDonationsAmount, kpis.periodDonationsAmount.
  EXTRA_MODULES.forEach((m) => {
    kpis[`total${capitalize(m.key)}`] = extraData[m.key].length;
    kpis[`period${capitalize(m.key)}`] = trend.reduce((s, t) => s + t[m.key], 0);
    if (m.amountField) {
      kpis[`total${capitalize(m.key)}Amount`] = extraData[m.key].reduce((s, r) => s + Number(r[m.amountField] || 0), 0);
      kpis[`period${capitalize(m.key)}Amount`] = trend.reduce((s, t) => s + t[`${m.key}Amount`], 0);
    }
  });

  const personnelByRole = STAFF_ROLES
    .map((role) => ({ key: role, count: staff.filter((u) => u.role === role && u.status === 'Active').length }))
    .filter((r) => r.count > 0);

  const eventsByType = countByKey(events, (e) => e.event_type);

  const taskStatusBreakdown = countByKey(tasks, (t) => t.status);

  return res.json({
    success: true,
    range,
    kpis,
    trend,
    personnelByRole,
    eventsByType,
    taskStatusBreakdown
  });
};

// GET /api/analytics/platform?range=weekly|monthly|yearly  (SuperAdmin)
// Platform-wide view across every organization.
const getPlatformAnalytics = async (req, res) => {
  const range = VALID_RANGES.includes(req.query.range) ? req.query.range : 'weekly';

  const [orgsRes, campsRes, eventsRes, usersRes] = await Promise.all([
    supabase.from('organizations').select('id, name, status, created_at'),
    supabase.from('camps').select('id, org_id, status, created_at'),
    supabase.from('events').select('id, org_id, status, event_type, created_at'),
    supabase.from('users').select('id, org_id, role, status, created_at')
  ]);

  // const err = orgsRes.error || campsRes.error || eventsRes.error || usersRes.error;
  // if (err) return res.status(500).json({ success: false, error: 'Could not load platform analytics.' });
const err =
  campsRes.error ||
  eventsRes.error ||
  usersRes.error ||
  tasksRes.error ||
  extraRes.find((r) => r.error)?.error;

if (err) {
  console.error('ANALYTICS SUPABASE ERROR:', err);

  return res.status(500).json({
    success: false,
    error: err.message || 'Could not load analytics.'
  });
}
  const organizations = orgsRes.data;
  const camps = campsRes.data;
  const events = eventsRes.data;
  const users = usersRes.data.filter((u) => u.role !== 'SuperAdmin');

  const buckets = getBuckets(range);
  const trend = buckets.map((b) => ({
    label: b.label,
    events: countInRange(events, b.start, b.end),
    camps: countInRange(camps, b.start, b.end),
    newOrganizations: countInRange(organizations, b.start, b.end),
    totalOrganizations: countBefore(organizations, b.end),
    newUsers: countInRange(users, b.start, b.end),
    totalUsers: countBefore(users, b.end)
  }));

  const periodEvents = trend.reduce((s, t) => s + t.events, 0);
  const periodCamps = trend.reduce((s, t) => s + t.camps, 0);
  const periodNewOrganizations = trend.reduce((s, t) => s + t.newOrganizations, 0);
  const periodNewUsers = trend.reduce((s, t) => s + t.newUsers, 0);

  const kpis = {
    totalOrganizations: organizations.length,
    activeOrganizations: organizations.filter((o) => o.status === 'Active').length,
    pendingOrganizations: organizations.filter((o) => o.status === 'Pending').length,
    suspendedOrganizations: organizations.filter((o) => o.status === 'Suspended').length,
    totalEvents: events.length,
    totalCamps: camps.length,
    totalUsers: users.length,
    periodEvents,
    periodCamps,
    periodNewOrganizations,
    periodNewUsers
  };

  // Per-organization activity leaderboard - which orgs are actually using the platform
  const topOrganizations = organizations
    .map((org) => {
      const orgCamps = camps.filter((c) => c.org_id === org.id).length;
      const orgEvents = events.filter((e) => e.org_id === org.id).length;
      const orgUsers = users.filter((u) => u.org_id === org.id).length;
      return {
        id: org.id,
        name: org.name,
        status: org.status,
        camps: orgCamps,
        events: orgEvents,
        users: orgUsers,
        activityScore: orgCamps + orgEvents
      };
    })
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 8);

  const orgStatusBreakdown = countByKey(organizations, (o) => o.status);

  return res.json({
    success: true,
    range,
    kpis,
    trend,
    topOrganizations,
    orgStatusBreakdown
  });
};

module.exports = { getOrgAnalytics, getPlatformAnalytics };