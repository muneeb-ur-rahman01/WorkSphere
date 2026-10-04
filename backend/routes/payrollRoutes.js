const express = require('express');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { handle } = require('../utils/handle');
const p = require('../services/payrollService');

// Salary data is confidential: OrgAdmin of the caller's own organization only.
router.use(requireAuth, requireRole('OrgAdmin'));

router.get('/overview', handle((r) => p.salaryOverview({ user: r.user }), 'rows'));
router.get('/salaries', handle((r) => p.listSalaries({ user: r.user, employeeId: r.query.employeeId }), 'salaries'));
router.post('/salaries', requireOperational(), handle((r) => p.setSalary({ user: r.user, ...(r.body || {}) }), 'salary'));

router.get('/runs', handle((r) => p.listRuns({ user: r.user }), 'runs'));
router.post('/runs', requireOperational(), handle((r) => p.createRun({ user: r.user, ...(r.body || {}) }), null, 'Could not create the payroll run.'));
router.get('/runs/:id/records', handle((r) => p.listRecords({ user: r.user, id: r.params.id }), 'records'));
router.post('/runs/:id/regenerate', requireOperational(), handle((r) => p.regenerate({ user: r.user, id: r.params.id }), null));
router.post('/runs/:id/process', requireOperational(), handle((r) => p.processRun({ user: r.user, id: r.params.id }), null, 'Could not process payroll.'));
router.post('/runs/:id/sync', requireOperational(), handle((r) => p.syncRun({ user: r.user, id: r.params.id }), null));
router.post('/runs/:id/pay', requireOperational(), handle((r) => p.markPaid({ user: r.user, runId: r.params.id, recordIds: (r.body || {}).recordIds, paymentDate: (r.body || {}).paymentDate, transactionReference: (r.body || {}).transactionReference }), null, 'Could not record payment.'));
router.delete('/runs/:id', requireOperational(), handle(async (r) => { await p.deleteRun({ user: r.user, id: r.params.id }); }, null));
router.patch('/records/:id', requireOperational(), handle(async (r) => { await p.adjustRecord({ user: r.user, id: r.params.id, ...(r.body || {}) }); }, null));

router.get('/records', handle((r) => p.listPayrollRecords({ user: r.user, query: r.query }), 'records'));

// CSV export: same auth + org scoping + filters as the table. Streams in pages.
router.get('/export.csv', handle((r, res) => p.exportCsv({ user: r.user, query: r.query, res }), null, 'Could not export payroll.'));

module.exports = router;
