const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getExpenses, createExpense, updateExpenseStatus, deleteExpense } = require('../controllers/expenseController');

router.use(requireAuth);
router.get('/', getExpenses);
router.post('/', requireRoleOrSectionPermission('expenses', 'OrgAdmin'), requireOperational(), createExpense);

// Expense Approval is always an OrgAdmin-only responsibility (spec section 15).
router.patch('/:id/status', requireRole('OrgAdmin'), updateExpenseStatus);

router.delete('/:id', requireRoleOrSectionPermission('expenses', 'OrgAdmin'), deleteExpense);

module.exports = router;
