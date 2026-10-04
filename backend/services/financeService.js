const supabase = require('../config/supabase');
const { makeResource, httpErr, toApi, UUID, validDate } = require('./crudFactory');
const { notifyAdmins } = require('../utils/notify');
const payroll = require('./payrollService');

const METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Card', 'Online', 'Other'];
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

const accountCategory = async (orgId, id) => (await supabase.from('chart_of_accounts').select('category, status').eq('id', id).eq('org_id', orgId).maybeSingle()).data;

const nextNumber = async (orgId, table, col, prefix, attempt) => {
  const year = new Date().getFullYear();
  const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  return `${prefix}-${year}-${String((count || 0) + 1 + attempt).padStart(4, '0')}`;
};

const resources = {
  'chart-of-accounts': makeResource({
    table: 'chart_of_accounts', allowDelete: true, orderBy: ['code', true], filters: ['category', 'status'],
    duplicateMessage: 'An account with this code already exists.',
    fields: {
      code: { type: 'str', required: true, max: 12, pattern: /^[A-Za-z0-9.-]{1,12}$/, patternMsg: 'Code may only contain letters, numbers, dots and dashes (max 12).', label: 'Code' },
      name: { type: 'str', required: true, max: 120, label: 'Name' },
      category: { type: 'enum', values: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'], required: true, label: 'Category' },
      description: { type: 'text', max: 500 },
      status: { type: 'enum', values: ['Active', 'Inactive'], default: 'Active', label: 'Status' }
    },
    hooks: {
      beforeUpdate: async ({ row, before }) => {
        if (before.is_system && (row.code !== undefined || row.category !== undefined)) throw httpErr('The code and category of a system account cannot be changed.', 409);
        if (row.category && row.category !== before.category) {
          const { count } = await supabase.from('finance_transactions').select('id', { count: 'exact', head: true }).eq('org_id', before.org_id).eq('account_id', before.id);
          if (count > 0) throw httpErr('This account already has transactions, so its category cannot change.', 409);
        }
      },
      canDelete: async ({ user, row }) => {
        if (row.is_system) throw httpErr('System accounts cannot be deleted. Mark them Inactive instead.', 409);
        for (const t of ['finance_transactions', 'invoices', 'bills']) {
          const { count } = await supabase.from(t).select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('account_id', row.id);
          if (count > 0) throw httpErr('This account is used by existing records. Mark it Inactive instead.', 409);
        }
      }
    }
  }),

  // Manual income / expense entries only; system rows (payroll, payments, donations) are read-only.
  'transactions': makeResource({
    table: 'finance_transactions', createdBy: 'created_by', allowDelete: true, filters: ['type', 'accountId', 'category'], orderBy: ['txn_date', false],
    rowFilter: (q) => q.is('source_type', null), rowFilterMessage: 'System-generated transactions cannot be changed.',
    listFilter: (q, query) => {
      if (query.from && validDate(query.from)) q = q.gte('txn_date', query.from);
      if (query.to && validDate(query.to)) q = q.lte('txn_date', query.to);
      if (query.system === 'false') q = q.is('source_type', null);
      return q;
    },
    fields: {
      txnDate: { type: 'date', required: true, default: today, label: 'Date' },
      type: { type: 'enum', values: ['Income', 'Expense'], required: true, label: 'Type' },
      accountId: { type: 'ref', table: 'chart_of_accounts', required: true, label: 'Account' },
      category: { type: 'enum', values: ['Donation', 'Grant', 'Membership', 'Service Fee', 'Other', 'Operations', 'Supplies', 'Utilities', 'Rent', 'Travel'], default: 'Other', label: 'Category' },
      amount: { type: 'num', required: true, min: 0.01, max: 1000000000, label: 'Amount' },
      paymentMethod: { type: 'enum', values: METHODS, label: 'Payment method' },
      reference: { type: 'str', max: 100, label: 'Reference' },
      description: { type: 'text', max: 500 },
      donorId: { type: 'uuid', label: 'Donor' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => {
        const acc = await accountCategory(user.orgId, row.account_id);
        if (acc.status !== 'Active') throw httpErr('This account is inactive.');
        if (acc.category !== row.type) throw httpErr(`A ${row.type.toLowerCase()} entry must use an ${row.type.toLowerCase()} account.`);
        if (row.donor_id) {
          const { data } = await supabase.from('donors').select('id').eq('id', row.donor_id).eq('org_id', user.orgId).maybeSingle();
          if (!data) throw httpErr('Donor not found.');
        }
      },
      beforeUpdate: async ({ user, row, before }) => {
        const type = row.type ?? before.type, acc = row.account_id ?? before.account_id;
        const a = await accountCategory(user.orgId, acc);
        if (a.category !== type) throw httpErr(`A ${type.toLowerCase()} entry must use an ${type.toLowerCase()} account.`);
      }
    }
  }),

  invoices: makeResource({
    table: 'invoices', createdBy: 'created_by', allowDelete: true, filters: ['status'], orderBy: ['issue_date', false],
    duplicateMessage: 'An invoice with this number already exists.', retryCreate: 3,
    autoFill: async ({ user, row, attempt }) => (row.invoice_number ? row : { ...row, invoice_number: await nextNumber(user.orgId, 'invoices', 'invoice_number', 'INV', attempt) }),
    fields: {
      invoiceNumber: { type: 'str', max: 40, pattern: /^[A-Za-z0-9._\/-]+$/, patternMsg: 'Invoice number may contain letters, numbers and . _ / -', label: 'Invoice number' },
      partyName: { type: 'str', required: true, max: 160, label: 'Customer / donor name' },
      partyEmail: { type: 'email', label: 'Email' },
      donorId: { type: 'uuid', label: 'Donor' },
      issueDate: { type: 'date', default: today, label: 'Issue date' },
      dueDate: { type: 'date', required: true, label: 'Due date' },
      description: { type: 'text', max: 1000 },
      amount: { type: 'num', required: true, min: 0.01, max: 1000000000, label: 'Amount' },
      accountId: { type: 'ref', table: 'chart_of_accounts', label: 'Income account' },
      status: { type: 'enum', values: ['Draft', 'Sent', 'Void'], default: 'Draft', label: 'Status' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => {
        if (row.due_date < (row.issue_date || today())) throw httpErr('Due date cannot be before the issue date.');
        if (row.account_id && (await accountCategory(user.orgId, row.account_id)).category !== 'Income') throw httpErr('Select an income account.');
        if (row.donor_id) { const { data } = await supabase.from('donors').select('id').eq('id', row.donor_id).eq('org_id', user.orgId).maybeSingle(); if (!data) throw httpErr('Donor not found.'); }
      },
      beforeUpdate: async ({ user, row, before }) => {
        if (before.status === 'Void') throw httpErr('A void invoice cannot be changed.', 409);
        if (before.status !== 'Draft' && ['amount', 'party_name', 'issue_date', 'invoice_number', 'account_id'].some((k) => row[k] !== undefined && String(row[k]) !== String(before[k])))
          throw httpErr('Only draft invoices can have their details edited.', 409);
        if (row.status === 'Draft' && before.status !== 'Draft') throw httpErr('A sent invoice cannot go back to draft.', 409);
        if ((row.due_date ?? before.due_date) < (row.issue_date ?? before.issue_date)) throw httpErr('Due date cannot be before the issue date.');
        if (row.account_id && (await accountCategory(user.orgId, row.account_id)).category !== 'Income') throw httpErr('Select an income account.');
      },
      afterCreate: async ({ user, row }) => notifyAdmins(user.orgId, 'Invoice Created', `Invoice ${row.invoice_number} for ${row.party_name} (${money(row.amount).toLocaleString('en-US')}) was created.`, { dedupe_key: `invoice:created:${row.id}` }),
      canDelete: async ({ row }) => { if (row.status !== 'Draft') throw httpErr('Only draft invoices can be deleted. Void sent invoices instead.', 409); }
    }
  }),

  bills: makeResource({
    table: 'bills', createdBy: 'created_by', allowDelete: true, filters: ['status'], orderBy: ['bill_date', false],
    duplicateMessage: 'This vendor already has a bill with this number.',
    fields: {
      billNumber: { type: 'str', required: true, max: 60, label: 'Bill number' },
      vendorName: { type: 'str', required: true, max: 160, label: 'Vendor' },
      billDate: { type: 'date', default: today, label: 'Bill date' },
      dueDate: { type: 'date', required: true, label: 'Due date' },
      description: { type: 'text', max: 1000 },
      amount: { type: 'num', required: true, min: 0.01, max: 1000000000, label: 'Amount' },
      accountId: { type: 'ref', table: 'chart_of_accounts', label: 'Expense account' },
      status: { type: 'enum', values: ['Unpaid', 'Void'], default: 'Unpaid', label: 'Status' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => {
        if (row.due_date < (row.bill_date || today())) throw httpErr('Due date cannot be before the bill date.');
        if (row.account_id && (await accountCategory(user.orgId, row.account_id)).category !== 'Expense') throw httpErr('Select an expense account.');
      },
      beforeUpdate: async ({ user, row, before }) => {
        if (before.status === 'Void') throw httpErr('A void bill cannot be changed.', 409);
        if (row.status === 'Unpaid' && before.status !== 'Unpaid') throw httpErr('Invalid status change.', 409);
        if ((row.due_date ?? before.due_date) < (row.bill_date ?? before.bill_date)) throw httpErr('Due date cannot be before the bill date.');
        if (row.account_id && (await accountCategory(user.orgId, row.account_id)).category !== 'Expense') throw httpErr('Select an expense account.');
      },
      canDelete: async ({ row }) => { if (row.amount_paid > 0) throw httpErr('Bills with payments cannot be deleted.', 409); }
    }
  })
};

// ---------------------------------------------------------------- payments
const payOne = async ({ user, kind, id, amount, paidOn, method, reference }) => {
  const [table, fk, payTable] = kind === 'invoice' ? ['invoices', 'invoice_id', 'invoice_payments'] : ['bills', 'bill_id', 'bill_payments'];
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0 || n > 1000000000 || Math.abs(Math.round(n * 100) - n * 100) > 1e-6) throw httpErr('Amount must be positive with at most 2 decimals.');
  if (paidOn !== undefined && !validDate(paidOn)) throw httpErr('Payment date must be valid (YYYY-MM-DD).');
  if (method && !METHODS.includes(method)) throw httpErr('Invalid payment method.');
  if (reference && String(reference).length > 100) throw httpErr('Reference is too long.');
  if (!UUID.test(id || '')) throw httpErr('Invalid id.');
  const { data: doc } = await supabase.from(table).select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!doc) throw httpErr(`${kind === 'invoice' ? 'Invoice' : 'Bill'} not found.`, 404);
  const { data, error } = await supabase.from(payTable).insert({ org_id: user.orgId, [fk]: id, amount: n, paid_on: paidOn || today(), method: method || null, reference: reference || null, created_by: user.id }).select().single();
  if (error) {
    if (error.code === 'P0001') throw httpErr(error.message.replace(/^.*?: /, ''), 400);
    throw httpErr('Could not record the payment.', 500);
  }
  const { data: after } = await supabase.from(table).select('status, amount, amount_paid').eq('id', id).single();
  if (after.status === 'Paid') {
    const label = kind === 'invoice' ? `Invoice ${doc.invoice_number} (${doc.party_name})` : `Bill ${doc.bill_number} (${doc.vendor_name})`;
    await notifyAdmins(user.orgId, kind === 'invoice' ? 'Invoice Paid' : 'Bill Paid', `${label} is now fully paid.`, { dedupe_key: `${kind}:paid:${id}` });
  }
  return { payment: toApi(data), status: after.status, amountPaid: Number(after.amount_paid) };
};

const listPayments = async ({ user, kind, id }) => {
  const [table, fk] = kind === 'invoice' ? ['invoice_payments', 'invoice_id'] : ['bill_payments', 'bill_id'];
  if (!UUID.test(id || '')) throw httpErr('Invalid id.');
  const { data, error } = await supabase.from(table).select('*').eq('org_id', user.orgId).eq(fk, id).order('paid_on', { ascending: false });
  if (error) throw httpErr('Could not load payments.', 500);
  return data.map(toApi);
};

// ---------------------------------------------------------------- AR / AP
const bucket = (days) => (days <= 0 ? 'Current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+');

const notifyDue = async (orgId, kind, rows) => {
  const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), t = today();
  for (const r of rows) {
    const num = kind === 'invoice' ? r.invoice_number : r.bill_number, who = kind === 'invoice' ? r.party_name : r.vendor_name;
    const out = money(r.amount - r.amount_paid);
    if (r.due_date < t) await notifyAdmins(orgId, `${kind === 'invoice' ? 'Invoice' : 'Bill'} Overdue`, `${num} (${who}) was due on ${r.due_date}; ${out.toLocaleString('en-US')} outstanding.`, { dedupe_key: `${kind}:overdue:${r.id}` });
    else if (r.due_date <= soon) await notifyAdmins(orgId, `${kind === 'invoice' ? 'Invoice' : 'Bill'} Due Soon`, `${num} (${who}) is due on ${r.due_date}.`, { dedupe_key: `${kind}:due:${r.id}` });
  }
};

const outstanding = async ({ user, kind }) => {
  const [table, open] = kind === 'invoice' ? ['invoices', ['Sent', 'Partially Paid']] : ['bills', ['Unpaid', 'Partially Paid']];
  const { data, error } = await supabase.from(table).select('*').eq('org_id', user.orgId).in('status', open).order('due_date');
  if (error) throw httpErr('Could not load outstanding balances.', 500);
  const t = Date.parse(today());
  const rows = data.map((r) => {
    const out = money(r.amount - r.amount_paid), days = Math.floor((t - Date.parse(r.due_date)) / 864e5);
    return { ...toApi(r), outstanding: out, daysOverdue: Math.max(days, 0), overdue: days > 0, aging: bucket(days) };
  });
  await notifyDue(user.orgId, kind, data);
  const aging = {};
  rows.forEach((r) => { aging[r.aging] = money((aging[r.aging] || 0) + r.outstanding); });
  return { rows, totals: { outstanding: money(rows.reduce((a, r) => a + r.outstanding, 0)), overdue: money(rows.filter((r) => r.overdue).reduce((a, r) => a + r.outstanding, 0)), count: rows.length }, aging };
};

const receivedTotals = async ({ user, kind }) => {
  const [table, fk] = kind === 'invoice' ? ['invoice_payments', 'invoice_id'] : ['bill_payments', 'bill_id'];
  const { data } = await supabase.from(table).select('amount').eq('org_id', user.orgId);
  return money((data || []).reduce((a, r) => a + Number(r.amount), 0));
};

// ---------------------------------------------------------------- summary & payroll integration
const summary = async ({ user, from, to }) => {
  let q = supabase.from('finance_transactions').select('type, category, amount, txn_date, account_id').eq('org_id', user.orgId);
  if (from && validDate(from)) q = q.gte('txn_date', from);
  if (to && validDate(to)) q = q.lte('txn_date', to);
  const { data, error } = await q.limit(100000);
  if (error) throw httpErr('Could not load the financial summary.', 500);
  const tot = { income: 0, expense: 0 }, byCategory = {}, byMonth = {};
  for (const r of data) {
    const a = Number(r.amount), k = r.type === 'Income' ? 'income' : 'expense';
    tot[k] += a;
    const ck = `${r.type}:${r.category}`; byCategory[ck] = (byCategory[ck] || 0) + a;
    const m = r.txn_date.slice(0, 7); byMonth[m] = byMonth[m] || { income: 0, expense: 0 }; byMonth[m][k] += a;
  }
  const [ar, ap] = await Promise.all([outstanding({ user, kind: 'invoice' }), outstanding({ user, kind: 'bill' })]);
  return {
    income: money(tot.income), expense: money(tot.expense), net: money(tot.income - tot.expense),
    payrollExpense: money(byCategory['Expense:Payroll'] || 0),
    byCategory: Object.entries(byCategory).map(([k, v]) => ({ type: k.split(':')[0], category: k.split(':')[1], amount: money(v) })),
    byMonth: Object.entries(byMonth).sort().map(([month, v]) => ({ month, income: money(v.income), expense: money(v.expense) })),
    receivables: ar.totals, payables: ap.totals
  };
};

const payrollIntegration = async ({ user }) => {
  const runs = await payroll.listRuns({ user });
  const processed = runs.filter((r) => r.status !== 'Draft');
  return {
    runs,
    totals: {
      payrollExpensePosted: money(runs.filter((r) => r.synced).reduce((a, r) => a + (r.ledgerAmount || 0), 0)),
      unsynced: processed.filter((r) => !r.synced).length,
      inconsistent: processed.filter((r) => r.synced && r.consistent === false).length
    }
  };
};

module.exports = { resources, payOne, listPayments, outstanding, receivedTotals, summary, payrollIntegration, METHODS };
