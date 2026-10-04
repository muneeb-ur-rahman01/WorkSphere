// Small wrapper: run an async service call, return { success: true, ... } or a safe error.
const handle = (fn, key, fallback = 'Something went wrong.') => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (res.headersSent) return undefined;
    return res.json({ success: true, ...(key ? { [key]: result } : result || {}) });
  } catch (err) {
    if (res.headersSent) return res.destroy(err);
    if (!err.statusCode) console.error(`[${req.method} ${req.originalUrl}]`, err);
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : fallback });
  }
};
module.exports = { handle };
