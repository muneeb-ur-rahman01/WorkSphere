const svc = require('../services/attendanceService');

const handle = (fn, key, fallback) => async (req, res) => {
  try {
    const result = await fn(req);
    return res.json({ success: true, ...(key ? { [key]: result } : result) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : fallback });
  }
};

module.exports = {
  getToday: handle((req) => svc.getToday({ user: req.user }), null, 'Could not load attendance.'),
  checkIn: handle((req) => svc.checkIn({ user: req.user }), 'session', 'Could not check in.'),
  checkOut: handle((req) => svc.checkOut({ user: req.user }), 'session', 'Could not check out.'),
  getMine: handle((req) => svc.getMine({ user: req.user, month: req.query.month }), null, 'Could not load attendance.'),
  listOrgDay: handle((req) => svc.listOrgDay({ user: req.user, date: req.query.date }), null, 'Could not load attendance.'),
  getUserMonth: handle((req) => svc.getUserMonth({ user: req.user, targetUserId: req.params.userId, month: req.query.month }), null, 'Could not load attendance.'),
  adminCorrect: handle((req) => svc.adminCorrect({ user: req.user, id: req.params.id, ...req.body }), 'session', 'Could not correct attendance.')
};
