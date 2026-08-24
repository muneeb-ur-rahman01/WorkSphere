const supabase = require('../config/supabase');

const {
  VALID_RANGES,
  getBuckets,
  countInRange,
  countBefore,
  countByKey
} = require('../utils/analytics');

const STAFF_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership',
  'Executive Director'
];

// GET /api/analytics/org?range=weekly|monthly|yearly (OrgAdmin)
// Everything is scoped to the calling admin's own organization.
const getOrgAnalytics = async (req, res) => {
  const range = VALID_RANGES.includes(req.query.range)
    ? req.query.range
    : 'weekly';

  const orgId = req.user.orgId;

  const [
    campsRes,
    eventsRes,
    usersRes,
    tasksRes,
    meetingsRes
  ] = await Promise.all([
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

    // Meetings
    supabase
      .from('meetings')
      .select('id, status, meeting_date, created_at')
      .eq('org_id', orgId)
  ]);

  const err =
    campsRes.error ||
    eventsRes.error ||
    usersRes.error ||
    tasksRes.error ||
    meetingsRes.error;

  if (err) {
    console.error('ORG ANALYTICS ERROR:', err);

    return res.status(500).json({
      success: false,
      error: 'Could not load analytics.'
    });
  }

  const camps = campsRes.data || [];
  const events = eventsRes.data || [];
  const staff = (usersRes.data || []).filter(
    (u) => u.role !== 'OrgAdmin'
  );
  const tasks = tasksRes.data || [];
  const meetings = meetingsRes.data || [];

  const buckets = getBuckets(range);

  // ---------------------------------------------------------
  // Trend
  // ---------------------------------------------------------
  const trend = buckets.map((b) => ({
    label: b.label,

    events: countInRange(
      events,
      b.start,
      b.end
    ),

    camps: countInRange(
      camps,
      b.start,
      b.end
    ),

    meetings: countInRange(
      meetings,
      b.start,
      b.end,
      'meeting_date'
    ),

    newUsers: countInRange(
      staff,
      b.start,
      b.end
    ),

    totalUsers: countBefore(
      staff,
      b.end
    )
  }));

  // ---------------------------------------------------------
  // Period totals
  // ---------------------------------------------------------
  const periodEvents = trend.reduce(
    (sum, item) => sum + item.events,
    0
  );

  const periodCamps = trend.reduce(
    (sum, item) => sum + item.camps,
    0
  );

  const periodMeetings = trend.reduce(
    (sum, item) => sum + item.meetings,
    0
  );

  const periodNewUsers = trend.reduce(
    (sum, item) => sum + item.newUsers,
    0
  );

  // ---------------------------------------------------------
  // Task statistics
  // ---------------------------------------------------------
  const completedTasks = tasks.filter(
    (t) => t.status === 'Completed'
  ).length;

  // ---------------------------------------------------------
  // KPIs
  // ---------------------------------------------------------
  const kpis = {
    // Camps
    totalCamps: camps.length,

    upcomingCamps: camps.filter(
      (c) => c.status === 'Upcoming'
    ).length,

    completedCamps: camps.filter(
      (c) => c.status === 'Completed'
    ).length,

    // Events
    totalEvents: events.length,

    upcomingEvents: events.filter(
      (e) => e.status === 'Upcoming'
    ).length,

    completedEvents: events.filter(
      (e) => e.status === 'Completed'
    ).length,

    // Meetings
    totalMeetings: meetings.length,

    upcomingMeetings: meetings.filter(
      (m) => m.status === 'Upcoming'
    ).length,

    completedMeetings: meetings.filter(
      (m) => m.status === 'Completed'
    ).length,

    cancelledMeetings: meetings.filter(
      (m) => m.status === 'Cancelled'
    ).length,

    // Users
    totalUsers: staff.length,

    activeUsers: staff.filter(
      (u) => u.status === 'Active'
    ).length,

    pendingUsers: staff.filter(
      (u) => u.status === 'Pending'
    ).length,

    // Tasks
    totalTasks: tasks.length,

    completedTasks,

    taskCompletionRate:
      tasks.length > 0
        ? Math.round(
            (completedTasks / tasks.length) * 100
          )
        : 0,

    // Period stats
    periodEvents,
    periodCamps,
    periodMeetings,
    periodNewUsers
  };

  // ---------------------------------------------------------
  // Personnel by role
  // ---------------------------------------------------------
  const personnelByRole = STAFF_ROLES
    .map((role) => ({
      key: role,
      count: staff.filter(
        (u) =>
          u.role === role &&
          u.status === 'Active'
      ).length
    }))
    .filter((r) => r.count > 0);

  // ---------------------------------------------------------
  // Events by type
  // ---------------------------------------------------------
  const eventsByType = countByKey(
    events,
    (e) => e.event_type
  );

  // ---------------------------------------------------------
  // Task status breakdown
  // ---------------------------------------------------------
  const taskStatusBreakdown = countByKey(
    tasks,
    (t) => t.status
  );

  // ---------------------------------------------------------
  // Meeting status breakdown
  // ---------------------------------------------------------
  const meetingStatusBreakdown = countByKey(
    meetings,
    (m) => m.status
  );

  return res.json({
    success: true,
    range,
    kpis,
    trend,
    personnelByRole,
    eventsByType,
    taskStatusBreakdown,
    meetingStatusBreakdown
  });
};


// GET /api/analytics/platform?range=weekly|monthly|yearly (SuperAdmin)
// Platform-wide view across every organization.
const getPlatformAnalytics = async (req, res) => {
  const range = VALID_RANGES.includes(req.query.range)
    ? req.query.range
    : 'weekly';

  const [
    orgsRes,
    campsRes,
    eventsRes,
    usersRes
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, status, created_at'),

    supabase
      .from('camps')
      .select('id, org_id, status, created_at'),

    supabase
      .from('events')
      .select(
        'id, org_id, status, event_type, created_at'
      ),

    supabase
      .from('users')
      .select(
        'id, org_id, role, status, created_at'
      )
  ]);

  const err =
    orgsRes.error ||
    campsRes.error ||
    eventsRes.error ||
    usersRes.error;

  if (err) {
    return res.status(500).json({
      success: false,
      error: 'Could not load platform analytics.'
    });
  }

  const organizations = orgsRes.data || [];
  const camps = campsRes.data || [];
  const events = eventsRes.data || [];

  const users = (usersRes.data || []).filter(
    (u) => u.role !== 'SuperAdmin'
  );

  const buckets = getBuckets(range);

  const trend = buckets.map((b) => ({
    label: b.label,

    events: countInRange(
      events,
      b.start,
      b.end
    ),

    camps: countInRange(
      camps,
      b.start,
      b.end
    ),

    newOrganizations: countInRange(
      organizations,
      b.start,
      b.end
    ),

    totalOrganizations: countBefore(
      organizations,
      b.end
    ),

    newUsers: countInRange(
      users,
      b.start,
      b.end
    ),

    totalUsers: countBefore(
      users,
      b.end
    )
  }));

  const periodEvents = trend.reduce(
    (sum, item) => sum + item.events,
    0
  );

  const periodCamps = trend.reduce(
    (sum, item) => sum + item.camps,
    0
  );

  const periodNewOrganizations = trend.reduce(
    (sum, item) => sum + item.newOrganizations,
    0
  );

  const periodNewUsers = trend.reduce(
    (sum, item) => sum + item.newUsers,
    0
  );

  const kpis = {
    totalOrganizations: organizations.length,

    activeOrganizations: organizations.filter(
      (o) => o.status === 'Active'
    ).length,

    pendingOrganizations: organizations.filter(
      (o) => o.status === 'Pending'
    ).length,

    suspendedOrganizations: organizations.filter(
      (o) => o.status === 'Suspended'
    ).length,

    totalEvents: events.length,

    totalCamps: camps.length,

    totalUsers: users.length,

    periodEvents,
    periodCamps,
    periodNewOrganizations,
    periodNewUsers
  };

  // Per-organization activity leaderboard
  const topOrganizations = organizations
    .map((org) => {
      const orgCamps = camps.filter(
        (c) => c.org_id === org.id
      ).length;

      const orgEvents = events.filter(
        (e) => e.org_id === org.id
      ).length;

      const orgUsers = users.filter(
        (u) => u.org_id === org.id
      ).length;

      return {
        id: org.id,
        name: org.name,
        status: org.status,
        camps: orgCamps,
        events: orgEvents,
        users: orgUsers,
        activityScore:
          orgCamps + orgEvents
      };
    })
    .sort(
      (a, b) =>
        b.activityScore - a.activityScore
    )
    .slice(0, 8);

  const orgStatusBreakdown = countByKey(
    organizations,
    (o) => o.status
  );

  return res.json({
    success: true,
    range,
    kpis,
    trend,
    topOrganizations,
    orgStatusBreakdown
  });
};

module.exports = {
  getOrgAnalytics,
  getPlatformAnalytics
};