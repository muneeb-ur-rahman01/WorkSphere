const supabase = require('../config/supabase');

const {
  VALID_RANGES,
  getBuckets,
  getRowDate,
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
  {
    key: 'donations',
    label: 'Donations',
    amountField: 'amount'
  },
  { key: 'sponsors', label: 'Sponsors' },
  {
    key: 'sponsorships',
    label: 'Sponsorships',
    amountField: 'amount'
  },
  { key: 'partners', label: 'Partners' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
  {
    key: 'expenses',
    label: 'Expenses',
    amountField: 'amount'
  },
  { key: 'documents', label: 'Documents' }
];

const normalizeRange = (range) => {
  return VALID_RANGES.includes(range)
    ? range
    : 'weekly';
};

const capitalize = (value = '') => {
  return (
    String(value).charAt(0).toUpperCase() +
    String(value).slice(1)
  );
};

const sumAmount = (
  rows = [],
  field = 'amount'
) => {
  return rows.reduce((total, row) => {
    const value = Number(row?.[field] || 0);

    return Number.isFinite(value)
      ? total + value
      : total;
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

    const date = getRowDate(row);

    if (!date) {
      return total;
    }

    if (date < start || date >= end) {
      return total;
    }

    return total + value;
  }, 0);
};

// ============================================================
// ORGANIZATION ANALYTICS
// ============================================================

const getOrgAnalytics = async ({
  orgId,
  organizationId,
  range = 'weekly'
}) => {
  const finalOrgId =
    orgId || organizationId;

  if (!finalOrgId) {
    throw new Error('Organization ID is missing.');
  }

  const normalizedRange =
    normalizeRange(range);

  const buckets =
    getBuckets(normalizedRange);

  const rangeStart =
    buckets[0]?.start;

  const rangeEnd =
    buckets[buckets.length - 1]?.end;

  console.log(
    '[Analytics] Organization:',
    finalOrgId
  );

  console.log(
    '[Analytics] Range:',
    normalizedRange
  );

  // ============================================================
  // FETCH CORE DATA
  // ============================================================

  const [
    campsRes,
    eventsRes,
    usersRes,
    tasksRes
  ] = await Promise.all([
    supabase
      .from('camps')
      .select('*')
      .eq('org_id', finalOrgId),

    supabase
      .from('events')
      .select('*')
      .eq('org_id', finalOrgId),

    supabase
      .from('users')
      .select('*')
      .eq('org_id', finalOrgId),

    supabase
      .from('tasks')
      .select('*')
      .eq('org_id', finalOrgId)
  ]);

  const coreResponses = [
    campsRes,
    eventsRes,
    usersRes,
    tasksRes
  ];

  const failedCoreResponse =
    coreResponses.find(
      (result) => result.error
    );

  if (failedCoreResponse) {
    console.error(
      '[Analytics] Core Supabase error:',
      failedCoreResponse.error
    );

    throw new Error(
      failedCoreResponse.error.message
    );
  }

  const camps =
    campsRes.data || [];

  const events =
    eventsRes.data || [];

  // IMPORTANT:
  // Do NOT remove OrgAdmin here.
  // Total Users should represent all users
  // belonging to this organization.
  const users =
    usersRes.data || [];

  const tasks =
    tasksRes.data || [];

  console.log(
    '[Analytics] Raw organization data:',
    {
      orgId: finalOrgId,
      camps: camps.length,
      events: events.length,
      users: users.length,
      tasks: tasks.length
    }
  );

  // ============================================================
  // FETCH EXTRA MODULES
  // ============================================================

  const extraResults = await Promise.all(
    EXTRA_MODULES.map(async (module) => {
      try {
        const result = await supabase
          .from(module.key)
          .select('*')
          .eq('org_id', finalOrgId);

        if (result.error) {
          console.warn(
            `[Analytics] ${module.key} query failed:`,
            result.error.message
          );

          return {
            key: module.key,
            data: []
          };
        }

        return {
          key: module.key,
          data: result.data || []
        };
      } catch (error) {
        console.warn(
          `[Analytics] ${module.key} query exception:`,
          error.message
        );

        return {
          key: module.key,
          data: []
        };
      }
    })
  );

  const extraData = {};

  extraResults.forEach((result) => {
    extraData[result.key] =
      result.data || [];

    console.log(
      `[Analytics] ${result.key}:`,
      extraData[result.key].length
    );
  });

  // ============================================================
  // BASIC PERIOD COUNTS
  // ============================================================

  const periodCamps =
    countInRange(
      camps,
      rangeStart,
      rangeEnd
    );

  const periodEvents =
    countInRange(
      events,
      rangeStart,
      rangeEnd
    );

  const periodNewUsers =
    countInRange(
      users,
      rangeStart,
      rangeEnd
    );

  const periodTasks =
    countInRange(
      tasks,
      rangeStart,
      rangeEnd
    );

  // Keep variable used for consistency.
  void periodTasks;

  // ============================================================
  // USER STATUS
  // ============================================================

  const activeUsers =
    users.filter((user) => {
      const status =
        String(user?.status || '')
          .trim()
          .toLowerCase();

      return (
        status === 'active' ||
        status === 'approved'
      );
    }).length;

  const pendingUsers =
    users.filter((user) => {
      const status =
        String(user?.status || '')
          .trim()
          .toLowerCase();

      return status === 'pending';
    }).length;

  // ============================================================
  // TASK COMPLETION
  // ============================================================

  const completedTasks =
    tasks.filter((task) => {
      const status =
        String(task?.status || '')
          .trim()
          .toLowerCase();

      return (
        status === 'completed' ||
        status === 'complete'
      );
    }).length;

  const taskCompletionRate =
    tasks.length > 0
      ? Math.round(
          (completedTasks / tasks.length) * 100
        )
      : 0;

  // ============================================================
  // EXTRA MODULE KPI DATA
  // ============================================================

  const extraKpis = {};

  EXTRA_MODULES.forEach((module) => {
    const rows =
      extraData[module.key] || [];

    const capitalizedKey =
      capitalize(module.key);

    const totalKey =
      `total${capitalizedKey}`;

    const periodKey =
      `period${capitalizedKey}`;

    extraKpis[totalKey] =
      rows.length;

    extraKpis[periodKey] =
      countInRange(
        rows,
        rangeStart,
        rangeEnd
      );

    if (module.amountField) {
      const totalAmountKey =
        `total${capitalizedKey}Amount`;

      const periodAmountKey =
        `period${capitalizedKey}Amount`;

      extraKpis[totalAmountKey] =
        sumAmount(
          rows,
          module.amountField
        );

      extraKpis[periodAmountKey] =
        sumAmountInRange(
          rows,
          module.amountField,
          rangeStart,
          rangeEnd
        );
    }
  });

  // ============================================================
  // FINAL KPI STRUCTURE
  // ============================================================

  const kpis = {
    totalCamps:
      camps.length,

    periodCamps,

    totalEvents:
      events.length,

    periodEvents,

    totalUsers:
      users.length,

    activeUsers,

    pendingUsers,

    periodNewUsers,

    totalTasks:
      tasks.length,

    completedTasks,

    taskCompletionRate,

    ...extraKpis
  };

  // ============================================================
  // TREND
  // ============================================================

  const trend =
    buckets.map((bucket) => {
      const item = {
        label: bucket.label,

        camps:
          countInRange(
            camps,
            bucket.start,
            bucket.end
          ),

        events:
          countInRange(
            events,
            bucket.start,
            bucket.end
          ),

        newUsers:
          countInRange(
            users,
            bucket.start,
            bucket.end
          ),

        // Cumulative users up to this bucket.
        totalUsers:
          users.filter((user) => {
            const date =
              getRowDate(user);

            return (
              date &&
              date < bucket.end
            );
          }).length
      };

      EXTRA_MODULES.forEach((module) => {
        const rows =
          extraData[module.key] || [];

        item[module.key] =
          countInRange(
            rows,
            bucket.start,
            bucket.end
          );

        if (module.amountField) {
          item[`${module.key}Amount`] =
            sumAmountInRange(
              rows,
              module.amountField,
              bucket.start,
              bucket.end
            );
        }
      });

      return item;
    });

  // ============================================================
  // PERSONNEL BY ROLE
  // ============================================================

  const personnelByRole =
    STAFF_ROLES.map((role) => ({
      key: role,
      count:
        users.filter(
          (user) =>
            String(user?.role || '')
              .trim()
              .toLowerCase() ===
            role.toLowerCase()
        ).length
    }));

  // ============================================================
  // EVENTS BY TYPE
  // ============================================================

  const eventsByType =
    countByKey(
      events,
      'type'
    );

  // ============================================================
  // TASK STATUS
  // ============================================================

  const taskStatusBreakdown =
    countByKey(
      tasks,
      'status'
    );

  // ============================================================
  // FINAL RESPONSE
  // ============================================================

  return {
    range: normalizedRange,

    kpis,

    trend,

    personnelByRole,

    eventsByType,

    taskStatusBreakdown
  };
};

// ============================================================
// PLATFORM ANALYTICS
// ============================================================

const getPlatformAnalytics = async ({
  range = 'weekly'
}) => {
  const normalizedRange =
    normalizeRange(range);

  const buckets =
    getBuckets(normalizedRange);

  const rangeStart =
    buckets[0]?.start;

  const rangeEnd =
    buckets[buckets.length - 1]?.end;

  // ============================================================
  // FETCH PLATFORM DATA
  // ============================================================

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

  const failedResponse =
    responses.find(
      (result) => result.error
    );

  if (failedResponse) {
    console.error(
      '[Analytics] Platform Supabase error:',
      failedResponse.error
    );

    throw new Error(
      failedResponse.error.message
    );
  }

  const organizations =
    organizationsRes.data || [];

  const camps =
    campsRes.data || [];

  const events =
    eventsRes.data || [];

  // SuperAdmin ko platform users mein count nahi karna
  const users =
    (usersRes.data || []).filter(
      (user) =>
        String(user?.role || '')
          .toLowerCase() !== 'superadmin'
    );

  console.log(
    '[Analytics] Platform data:',
    {
      organizations: organizations.length,
      camps: camps.length,
      events: events.length,
      users: users.length
    }
  );

  // ============================================================
  // ORGANIZATION STATUS
  // ============================================================

  const activeOrganizations =
    organizations.filter((org) => {
      const status =
        String(org?.status || '')
          .trim()
          .toLowerCase();

      return (
        status === 'active' ||
        status === 'approved'
      );
    }).length;

  const pendingOrganizations =
    organizations.filter((org) => {
      const status =
        String(org?.status || '')
          .trim()
          .toLowerCase();

      return status === 'pending';
    }).length;

  // ============================================================
  // PERIOD COUNTS
  // ============================================================

  const periodOrganizations =
    countInRange(
      organizations,
      rangeStart,
      rangeEnd
    );

  const periodCamps =
    countInRange(
      camps,
      rangeStart,
      rangeEnd
    );

  const periodEvents =
    countInRange(
      events,
      rangeStart,
      rangeEnd
    );

  const periodNewUsers =
    countInRange(
      users,
      rangeStart,
      rangeEnd
    );

  // ============================================================
  // KPI STRUCTURE
  // ============================================================

  const kpis = {
    totalOrganizations:
      organizations.length,

    activeOrganizations,

    pendingOrganizations,

    periodOrganizations,

    totalCamps:
      camps.length,

    periodCamps,

    totalEvents:
      events.length,

    periodEvents,

    totalUsers:
      users.length,

    periodNewUsers
  };

  // ============================================================
  // TREND
  // ============================================================

  const trend =
    buckets.map((bucket) => {
      const totalOrganizations =
        organizations.filter((org) => {
          const date =
            getRowDate(org);

          return (
            date &&
            date < bucket.end
          );
        }).length;

      const totalUsers =
        users.filter((user) => {
          const date =
            getRowDate(user);

          return (
            date &&
            date < bucket.end
          );
        }).length;

      const newOrganizations =
        countInRange(
          organizations,
          bucket.start,
          bucket.end
        );

      const newUsers =
        countInRange(
          users,
          bucket.start,
          bucket.end
        );

      return {
        label: bucket.label,

        camps:
          countInRange(
            camps,
            bucket.start,
            bucket.end
          ),

        events:
          countInRange(
            events,
            bucket.start,
            bucket.end
          ),

        newOrganizations,

        totalOrganizations,

        newUsers,

        totalUsers
      };
    });

  // ============================================================
  // TOP ORGANIZATIONS
  // ============================================================

  const topOrganizations =
    organizations
      .map((org) => {
        const orgCamps =
          camps.filter(
            (camp) =>
              camp.org_id === org.id
          ).length;

        const orgEvents =
          events.filter(
            (event) =>
              event.org_id === org.id
          ).length;

        const orgUsers =
          users.filter(
            (user) =>
              user.org_id === org.id
          ).length;

        return {
          id: org.id,

          name:
            org.name ||
            org.organization_name ||
            'Unnamed Organization',

          status:
            org.status ||
            'Unknown',

          camps:
            orgCamps,

          events:
            orgEvents,

          users:
            orgUsers,

          activity:
            orgCamps +
            orgEvents
        };
      })
      .sort(
        (a, b) =>
          b.activity - a.activity
      )
      .slice(0, 10);

  // ============================================================
  // ORGANIZATION STATUS BREAKDOWN
  // ============================================================

  const orgStatusBreakdown =
    countByKey(
      organizations,
      'status'
    );

  // ============================================================
  // FINAL RESPONSE
  // ============================================================

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