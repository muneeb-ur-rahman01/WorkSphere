const validateExpenseQuery = (req, res, next) => {
  const {
    orgId,
    status,
    projectId,
    campaignId
  } = req.query;

  req.expenseFilters = {
    orgId,
    status,
    projectId,
    campaignId
  };

  next();
};

const validateCreateExpense = (req, res, next) => {
  const {
    description,
    category,
    amount,
    projectId,
    campaignId,
    notes
  } = req.body;

  if (!description || !amount) {
    return res.status(400).json({
      success: false,
      error: 'description and amount are required.'
    });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be greater than zero.'
    });
  }

  req.expenseData = {
    description,
    category,
    amount,
    projectId,
    campaignId,
    notes
  };

  next();
};

const validateExpenseStatus = (req, res, next) => {
  const { status } = req.body;

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.expenseStatus = status;

  next();
};

const validateExpenseId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Expense id is required.'
    });
  }

  next();
};

module.exports = {
  validateExpenseQuery,
  validateCreateExpense,
  validateExpenseStatus,
  validateExpenseId
};