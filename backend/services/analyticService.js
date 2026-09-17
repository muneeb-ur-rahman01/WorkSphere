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

const EXTRA_MODULES = [
  { key: 'meetings', label: 'Meetings' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'projects', label: 'Projects' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'donors', label: 'Donors' },
  { key: 'donations', label: 'Donations', amountField: 'amount' },
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'sponsorships', label: 'Sponsorships', amountField: 'amount' },
  { key: 'partners', label: 'Partners' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
  { key: 'expenses', label: 'Expenses', amountField: 'amount' },
  { key: 'documents', label: 'Documents' }
];

const normalizeRange = (range) => {
  return VALID_RANGES.includes(range) ? range : 'weekly';
};

const capitalize = (value = '') => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const sumAmount = (rows = [], field = 'amount') => {
  return rows.reduce((total, row) => {
    const value = Number(row?.[field] || 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
};

const sumAmountInRange = (
  rows = [],
  field = 'amount',
  start,
  end
) => {
  return rows.reduce((total, row) => {
    const value = Number(row?.[field] || 0);

    if (!Number.isFinite(value)) {
      return total;
    }

    const date = new Date(row.created_at);

    if (
      Number.isNaN(date.getTime()) ||
      date < start ||
      date > end
    ) {
      return total;
    }

    return total + value;
  }, 0);
};

const getOrgAnalytics = async ({ orgId, range = 'weekly' }) => {
  if (!orgId) {
    throw new Error('Organization ID is missing.');
  }

  const normalizedRange = normalizeRange(range);
  const buckets = getBuckets(normalizedRange);

  const [
    campsRes,
    eventsRes,
    usersRes,
    tasksRes,
    ...extraResults
  ] = await Promise.all([
    supabase
      .from('camps')
      .select('*')
      .eq('org_id', orgId),

    supabase
      .from('events')
      .select('*')
      .eq('org_id', orgId),

    supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId),

    supabase
      .from('tasks')
      .select('*')
      .eq('org_id', orgId),

    ...EXTRA_MODULES.map((module) =>
      supabase
        .from(module.key)
        .select('*')
        .eq('org_id', orgId)
    )
  ]);

  const responses = [
    campsRes,
    eventsRes,
    usersRes,
    tasksRes,
    ...extraResults
  ];

  const failedResponse = responses.find((result) => result.error);

  if (failedResponse) {
    throw new Error(failedResponse.error.message);
  }

  const camps = campsRes.data || [];
  const events = eventsRes.data || [];

  const users = (usersRes.data || []).filter(
    (user) => user.role !== 'OrgAdmin'
  );

  const tasks = tasksRes.data || [];

  const extraData = {};

  EXTRA_MODULES.forEach((module, index) => {
    extraData[module.key] = extraResults[index].data || [];
  });

  /*
   * ----------------------------------------
   * KPI COUNTS
   * ----------------------------------------
   */

  const kpis = {
    camps: {
      total: camps.length,
      current: countInRange(camps, normalizedRange),
      previous: countBefore(camps, normalizedRange)
    },

    events: {
      total: events.length,
      current: countInRange(events, normalizedRange),
      previous: countBefore(events, normalizedRange)
    },

    users: {
      total: users.length,
      current: countInRange(users, normalizedRange),
      previous: countBefore(users, normalizedRange)
    },

    tasks: {
      total: tasks.length,
      current: countInRange(tasks, normalizedRange),
      previous: countBefore(tasks, normalizedRange)
    }
  };

  /*
   * ----------------------------------------
   * EXTRA MODULE KPIs
   * ----------------------------------------
   */

  EXTRA_MODULES.forEach((module) => {
    const rows = extraData[module.key];

    if (module.amountField) {
      kpis[module.key] = {
        total: rows.length,
        current: countInRange(rows, normalizedRange),
        previous: countBefore(rows, normalizedRange),
        amount: sumAmount(rows, module.amountField)
      };
    } else {
      kpis[module.key] = {
        total: rows.length,
        current: countInRange(rows, normalizedRange),
        previous: countBefore(rows, normalizedRange)
      };
    }
  });

  /*
   * ----------------------------------------
   * TREND
   * ----------------------------------------
   */

  const trend = buckets.map((bucket) => {
    const start = bucket.start;
    const end = bucket.end;

    const item = {
      label: bucket.label,

      camps: camps.filter((row) => {
        const date = new Date(row.created_at);
        return date >= start && date <= end;
      }).length,

      events: events.filter((row) => {
        const date = new Date(row.created_at);
        return date >= start && date <= end;
      }).length,

      users: users.filter((row) => {
        const date = new Date(row.created_at);
        return date >= start && date <= end;
      }).length,

      tasks: tasks.filter((row) => {
        const date = new Date(row.created_at);
        return date >= start && date <= end;
      }).length
    };

    EXTRA_MODULES.forEach((module) => {
      const rows = extraData[module.key];

      item[module.key] = rows.filter((row) => {
        const date = new Date(row.created_at);
        return date >= start && date <= end;
      }).length;

      if (module.amountField) {
        item[`${module.key}Amount`] = sumAmountInRange(
          rows,
          module.amountField,
          start,
          end
        );
      }
    });

    return item;
  });

  /*
   * ----------------------------------------
   * PERSONNEL BY ROLE
   * ----------------------------------------
   */

  const personnelByRole = STAFF_ROLES.map((role) => ({
    role,
    count: users.filter((user) => user.role === role).length
  }));

  /*
   * ----------------------------------------
   * EVENTS BY TYPE
   * ----------------------------------------
   */

  const eventsByType = Object.entries(
    countByKey(events, 'type')
  ).map(([type, count]) => ({
    type: capitalize(type),
    count
  }));

  /*
   * ----------------------------------------
   * TASK STATUS
   * ----------------------------------------
   */

  const taskStatusBreakdown = Object.entries(
    countByKey(tasks, 'status')
  ).map(([status, count]) => ({
    status: capitalize(status),
    count
  }));

  return {
    range: normalizedRange,
    kpis,
    trend,
    personnelByRole,
    eventsByType,
    taskStatusBreakdown
  };
};

const getPlatformAnalytics = async ({ range = 'weekly' }) => {
  const normalizedRange = normalizeRange(range);
  const buckets = getBuckets(normalizedRange);

  const [
    organizationsRes,
    campsRes,
    eventsRes,
    usersRes
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('*'),

    supabase
      .from('camps')
      .select('*'),

    supabase
      .from('events')
      .select('*'),

    supabase
      .from('users')
      .select('*')
  ]);

  const responses = [
    organizationsRes,
    campsRes,
    eventsRes,
    usersRes
  ];

  const failedResponse = responses.find((result) => result.error);

  if (failedResponse) {
    throw new Error(failedResponse.error.message);
  }

  const organizations = organizationsRes.data || [];
  const camps = campsRes.data || [];
  const events = eventsRes.data || [];

  const users = (usersRes.data || []).filter(
    (user) => user.role !== 'SuperAdmin'
  );

  /*
   * ----------------------------------------
   * PLATFORM KPIs
   * ----------------------------------------
   */

  const kpis = {
    organizations: {
      total: organizations.length,
      current: countInRange(organizations, normalizedRange),
      previous: countBefore(organizations, normalizedRange)
    },

    camps: {
      total: camps.length,
      current: countInRange(camps, normalizedRange),
      previous: countBefore(camps, normalizedRange)
    },

    events: {
      total: events.length,
      current: countInRange(events, normalizedRange),
      previous: countBefore(events, normalizedRange)
    },

    users: {
      total: users.length,
      current: countInRange(users, normalizedRange),
      previous: countBefore(users, normalizedRange)
    }
  };

  /*
   * ----------------------------------------
   * PLATFORM TREND
   * ----------------------------------------
   */

  const trend = buckets.map((bucket) => {
    const start = bucket.start;
    const end = bucket.end;

    const countCreated = (rows) =>
      rows.filter((row) => {
        const date = new Date(row.created_at);
        return date >= start && date <= end;
      }).length;

    return {
      label: bucket.label,
      organizations: countCreated(organizations),
      camps: countCreated(camps),
      events: countCreated(events),
      users: countCreated(users)
    };
  });

  /*
   * ----------------------------------------
   * TOP ORGANIZATIONS
   * ----------------------------------------
   */

  const topOrganizations = organizations
    .map((org) => {
      const orgCamps = camps.filter(
        (camp) => camp.org_id === org.id
      ).length;

      const orgEvents = events.filter(
        (event) => event.org_id === org.id
      ).length;

      const orgUsers = users.filter(
        (user) => user.org_id === org.id
      ).length;

      return {
        id: org.id,
        name: org.name,
        camps: orgCamps,
        events: orgEvents,
        users: orgUsers,
        activity: orgCamps + orgEvents + orgUsers
      };
    })
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 10);

  /*
   * ----------------------------------------
   * ORGANIZATION STATUS
   * ----------------------------------------
   */

  const orgStatusBreakdown = Object.entries(
    countByKey(organizations, 'status')
  ).map(([status, count]) => ({
    status: capitalize(status),
    count
  }));

  return {
    range: normalizedRange,
    kpis,
    trend,
    topOrganizations,
    orgStatusBreakdown
  };
};

module.exports = {
  getOrgAnalytics,
  getPlatformAnalytics
};