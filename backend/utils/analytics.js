// ============================================================
// Shared Analytics Helpers
// ============================================================

const VALID_RANGES = ['weekly', 'monthly', 'yearly'];

// ============================================================
// DATE BUCKETS
// ============================================================

const getBuckets = (range) => {
  const now = new Date();
  const buckets = [];

  if (range === 'weekly') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i
      );

      const end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 1
      );

      buckets.push({
        start,
        end,
        label: start.toLocaleDateString('en-US', {
          weekday: 'short'
        })
      });
    }

    return buckets;
  }

  if (range === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i * 7
      );

      const end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 7
      );

      buckets.push({
        start,
        end,
        label: start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      });
    }

    return buckets;
  }

  // yearly
  for (let i = 11; i >= 0; i--) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const end = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      1
    );

    buckets.push({
      start,
      end,
      label: start.toLocaleDateString('en-US', {
        month: 'short'
      })
    });
  }

  return buckets;
};

// ============================================================
// GET DATE FROM ROW
// Supports different possible date column names.
// ============================================================

const getRowDate = (row, dateField = 'created_at') => {
  if (!row) {
    return null;
  }

  const possibleDates = [
    row[dateField],
    row.created_at,
    row.createdAt,
    row.updated_at,
    row.updatedAt
  ];

  for (const value of possibleDates) {
    if (!value) {
      continue;
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

// ============================================================
// COUNT INSIDE RANGE
// [start, end)
// ============================================================

const countInRange = (
  rows = [],
  start,
  end,
  dateField = 'created_at'
) => {
  if (!Array.isArray(rows)) {
    return 0;
  }

  if (!start || !end) {
    return 0;
  }

  return rows.filter((row) => {
    const date = getRowDate(row, dateField);

    if (!date) {
      return false;
    }

    return date >= start && date < end;
  }).length;
};

// ============================================================
// COUNT BEFORE DATE
// ============================================================

const countBefore = (
  rows = [],
  date,
  dateField = 'created_at'
) => {
  if (!Array.isArray(rows)) {
    return 0;
  }

  if (!date) {
    return 0;
  }

  return rows.filter((row) => {
    const rowDate = getRowDate(row, dateField);

    if (!rowDate) {
      return false;
    }

    return rowDate < date;
  }).length;
};

// ============================================================
// GROUP / COUNT BY KEY
//
// Supports:
//
// countByKey(rows, 'status')
//
// AND:
//
// countByKey(rows, row => row.status)
// ============================================================

const countByKey = (rows = [], keyFn) => {
  const counts = {};

  if (!Array.isArray(rows)) {
    return [];
  }

  rows.forEach((row) => {
    let key;

    if (typeof keyFn === 'function') {
      key = keyFn(row);
    } else if (typeof keyFn === 'string') {
      key = row?.[keyFn];
    }

    const finalKey =
      key !== undefined &&
      key !== null &&
      String(key).trim() !== ''
        ? String(key)
        : 'Other';

    counts[finalKey] =
      (counts[finalKey] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([key, count]) => ({
      key,
      count
    }))
    .sort((a, b) => b.count - a.count);
};

module.exports = {
  VALID_RANGES,
  getBuckets,
  getRowDate,
  countInRange,
  countBefore,
  countByKey
};