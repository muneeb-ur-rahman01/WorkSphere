const expenseService = require('../services/expenseService');

const getExpenses = async (req, res) => {
  try {
    const expenses = await expenseService.getExpenses({
      user: req.user,
      filters: req.expenseFilters
    });

    return res.json({
      success: true,
      expenses
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch expenses.'
    });
  }
};

const createExpense = async (req, res) => {
  try {
    const expense = await expenseService.createExpense({
      user: req.user,
      ...req.expenseData
    });

    return res.json({
      success: true,
      expense
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not submit expense.'
    });
  }
};

const updateExpenseStatus = async (req, res) => {
  try {
    const expense = await expenseService.updateExpenseStatus({
      user: req.user,
      id: req.params.id,
      status: req.expenseStatus
    });

    return res.json({
      success: true,
      expense
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update expense status.'
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    await expenseService.deleteExpense({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete expense.'
    });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpenseStatus,
  deleteExpense
};