const supabase = require('../config/supabase');

const { serializeExpense } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

const getExpenses = async ({ user, filters }) => {
  const orgId = user.role === 'SuperAdmin' ? filters.orgId : user.orgId;

  let query = supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgId) query = query.eq('org_id', orgId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch expenses.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeExpense);
};

const createExpense = async ({
  user,
  description,
  category,
  amount,
  projectId,
  campaignId,
  notes
}) => {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      org_id: user.orgId,
      description,
      category,
      amount,
      project_id: projectId || null,
      campaign_id: campaignId || null,
      status: 'Pending',
      submitted_by: user.id,
      notes
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not submit expense.');
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.EXPENSE_SUBMITTED,
    entityType: 'expense',
    entityId: expense.id,
    entityLabel: `${description} — ${amount}`
  });

  return serializeExpense(expense);
};

const updateExpenseStatus = async ({ user, id, status }) => {
  const { data: expense, error } = await supabase
    .from('expenses')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update expense status.');
    err.statusCode = 500;
    throw err;
  }

  const actionMap = {
    Approved: AUDIT_ACTIONS.EXPENSE_APPROVED,
    Rejected: AUDIT_ACTIONS.EXPENSE_REJECTED
  };

  if (actionMap[status]) {
    await logAudit({
      actor: user,
      orgId: user.orgId,
      action: actionMap[status],
      entityType: 'expense',
      entityId: id,
      entityLabel: `${expense.description} — ${expense.amount}`
    });
  }

  return serializeExpense(expense);
};

const deleteExpense = async ({ user, id }) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete expense.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpenseStatus,
  deleteExpense
};