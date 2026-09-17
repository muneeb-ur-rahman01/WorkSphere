const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission,
  requireRole
} = require('../middleware/auth');

const { requireOperational } = require('../middleware/subscriptionAccess');

const {
  validateExpenseQuery,
  validateCreateExpense,
  validateExpenseStatus,
  validateExpenseId
} = require('../middleware/expense');

const {
  getExpenses,
  createExpense,
  updateExpenseStatus,
  deleteExpense
} = require('../controllers/expenseController');

router.use(requireAuth);

router.get(
  '/',
  validateExpenseQuery,
  getExpenses
);

router.post(
  '/',
  requireRoleOrSectionPermission('expenses', 'OrgAdmin'),
  requireOperational(),
  validateCreateExpense,
  createExpense
);

// Expense Approval is always an OrgAdmin-only responsibility.
router.patch(
  '/:id/status',
  requireRole('OrgAdmin'),
  validateExpenseId,
  validateExpenseStatus,
  updateExpenseStatus
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission('expenses', 'OrgAdmin'),
  validateExpenseId,
  deleteExpense
);

module.exports = router;