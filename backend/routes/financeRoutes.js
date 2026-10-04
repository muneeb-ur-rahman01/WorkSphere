const express = require('express');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { handle } = require('../utils/handle');
const f = require('../services/financeService');

router.use(requireAuth, requireRole('OrgAdmin')); // financial records: OrgAdmin of own org only

router.get('/summary', handle((r) => f.summary({ user: r.user, from: r.query.from, to: r.query.to }), null));
router.get('/payroll-integration', handle((r) => f.payrollIntegration({ user: r.user }), null));
router.get('/receivables', handle(async (r) => ({ ...(await f.outstanding({ user: r.user, kind: 'invoice' })), received: await f.receivedTotals({ user: r.user, kind: 'invoice' }) }), null));
router.get('/payables', handle(async (r) => ({ ...(await f.outstanding({ user: r.user, kind: 'bill' })), paid: await f.receivedTotals({ user: r.user, kind: 'bill' }) }), null));

router.get('/invoices/:id/payments', handle((r) => f.listPayments({ user: r.user, kind: 'invoice', id: r.params.id }), 'payments'));
router.post('/invoices/:id/payments', requireOperational(), handle((r) => f.payOne({ user: r.user, kind: 'invoice', id: r.params.id, ...(r.body || {}) }), null, 'Could not record the payment.'));
router.get('/bills/:id/payments', handle((r) => f.listPayments({ user: r.user, kind: 'bill', id: r.params.id }), 'payments'));
router.post('/bills/:id/payments', requireOperational(), handle((r) => f.payOne({ user: r.user, kind: 'bill', id: r.params.id, ...(r.body || {}) }), null, 'Could not record the payment.'));

const pick = (req, res, next) => {
  const x = Object.prototype.hasOwnProperty.call(f.resources, req.params.resource) ? f.resources[req.params.resource] : null;
  if (!x) return res.status(404).json({ success: false, error: 'Unknown resource.' });
  req.resource = x;
  return next();
};
router.get('/:resource', pick, handle((r) => r.resource.list({ user: r.user, query: r.query }), 'rows'));
router.post('/:resource', pick, requireOperational(), handle((r) => r.resource.create({ user: r.user, body: r.body }), 'row'));
router.patch('/:resource/:id', pick, requireOperational(), handle((r) => r.resource.update({ user: r.user, id: r.params.id, body: r.body }), 'row'));
router.delete('/:resource/:id', pick, requireOperational(), handle(async (r) => { await r.resource.remove({ user: r.user, id: r.params.id }); }, null));

module.exports = router;
