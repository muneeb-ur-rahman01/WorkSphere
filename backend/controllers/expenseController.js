const supabase = require('../config/supabase');
const { serializeExpense } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// GET /api/expenses?status=&projectId=&campaignId=
const getExpenses = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('expenses').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.projectId) query = query.eq('project_id', req.query.projectId);
  if (req.query.campaignId) query = query.eq('campaign_id', req.query.campaignId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch expenses.' });
  return res.json({ success: true, expenses: data.map(serializeExpense) });
};

// POST /api/expenses — any org member with access can submit; starts 'Pending'.
const createExpense = async (req, res) => {
  const { description, category, amount, projectId, campaignId, notes } = req.body;
  if (!description || !amount) return res.status(400).json({ success: false, error: 'description and amount are required.' });
  if (Number(amount) <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero.' });

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      org_id: req.user.orgId, description, category, amount,
      project_id: projectId || null, campaign_id: campaignId || null,
      status: 'Pending', submitted_by: req.user.id, notes
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not submit expense.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.EXPENSE_SUBMITTED,
    entityType: 'expense', entityId: expense.id, entityLabel: `${description} — ${amount}`
  });

  return res.json({ success: true, expense: serializeExpense(expense) });
};

// PATCH /api/expenses/:id/status (OrgAdmin only — Expense Approval)  body: { status }
const updateExpenseStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  const { data: expense, error } = await supabase
    .from('expenses')
    .update({ status, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update expense status.' });

  const actionMap = { Approved: AUDIT_ACTIONS.EXPENSE_APPROVED, Rejected: AUDIT_ACTIONS.EXPENSE_REJECTED };
  if (actionMap[status]) {
    await logAudit({
      actor: req.user, orgId: req.user.orgId, action: actionMap[status],
      entityType: 'expense', entityId: id, entityLabel: `${expense.description} — ${expense.amount}`
    });
  }

  return res.json({ success: true, expense: serializeExpense(expense) });
};

const deleteExpense = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete expense.' });
  return res.json({ success: true });
};

module.exports = { getExpenses, createExpense, updateExpenseStatus, deleteExpense };
