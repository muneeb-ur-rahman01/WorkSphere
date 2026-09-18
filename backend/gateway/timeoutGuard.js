// ============================================================
// Request timeout protection
//
// Prevents a single slow/stuck request (a hung upstream call to
// Supabase, Gemini, a payment gateway, etc.) from occupying a
// server resource indefinitely. Configurable via REQUEST_TIMEOUT_MS.
// ============================================================

const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const REQUEST_TIMEOUT_MS = int(process.env.REQUEST_TIMEOUT_MS, 30000);

const timeoutGuard = (req, res, next) => {
  // res.setTimeout fires if the response hasn't finished within the
  // given window; it does not abort in-flight work automatically, but
  // it guarantees the client gets a response and the connection is
  // freed instead of hanging forever.
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: 'The request took too long to process. Please try again.',
        requestId: req.id
      });
    }
  });

  next();
};

module.exports = timeoutGuard;
