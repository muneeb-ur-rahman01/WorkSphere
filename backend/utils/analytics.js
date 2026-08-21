// ============================================================
// Shared analytics helpers: turns a "range" query param into a
// series of time buckets, then counts/aggregates rows into them.
// Aggregation happens in JS (not SQL) to stay consistent with the
// rest of this codebase, which already fetches full table slices
// and reduces them on the server/client.
// ============================================================

const VALID_RANGES = ['weekly', 'monthly', 'yearly'];

// weekly  -> last 7 days, 1 bucket per day
// monthly -> last 6 weeks, 1 bucket per week (covers the last ~42 days)
// yearly  -> last 12 months, 1 bucket per calendar month
const getBuckets = (range) => {
  const now = new Date();
  const buckets = [];

  if (range === 'weekly') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      buckets.push({ start, end, label: start.toLocaleDateString('en-US', { weekday: 'short' }) });
    }
  } else if (range === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7 + 1);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
      buckets.push({ start, end, label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
  } else {
    // yearly (default fallback too)
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({ start, end, label: start.toLocaleDateString('en-US', { month: 'short' }) });
    }
  }

  return buckets;
};

// Count rows whose dateField falls within [start, end)
const countInRange = (rows, start, end, dateField = 'created_at') =>
  rows.filter((r) => {
    const d = new Date(r[dateField]);
    return d >= start && d < end;
  }).length;

// Count rows whose dateField is strictly before `date` - used for cumulative/"running total" series
const countBefore = (rows, date, dateField = 'created_at') =>
  rows.filter((r) => new Date(r[dateField]) < date).length;

// Group rows by an arbitrary key and count them, returning a sorted [{ key, count }] array
const countByKey = (rows, keyFn) => {
  const counts = {};
  rows.forEach((r) => {
    const key = keyFn(r) || 'Other';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
};

module.exports = { VALID_RANGES, getBuckets, countInRange, countBefore, countByKey };
