const supabase = require('../config/supabase');
const { httpErr, toApi, validDate, UUID } = require('./crudFactory');
const { notifyAdmins, notifyUser } = require('../utils/notify');
const { logAudit } = require('../utils/auditLog');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PAYABLE_STATUSES = ['Active', 'Probation', 'On Leave'];
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const period = (m, y) => `${MONTHS[m - 1]} ${y}`;

const checkPeriod = (month, year) => {
  month = Number(month); year = Number(year);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw httpErr('Month must be between 1 and 12.');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw httpErr('Year is invalid.');
  return { month, year };
};

// ---------------------------------------------------------------- salary structures
const listSalaries = async ({ user, employeeId }) => {
  let q = supabase.from('employee_salaries').select('*').eq('org_id', user.orgId).order('effective_from', { ascending: false }).limit(1000);
  if (employeeId) { if (!UUID.test(employeeId)) throw httpErr('Invalid employee.'); q = q.eq('employee_id', employeeId); }
  const { data, error } = await q;
  if (error) throw httpErr('Could not load salaries.', 500);
  return data.map(toApi);
};

// One row per employee with current salary + recurring components (for the overview table)
const salaryOverview = async ({ user }) => {
  const [emps, sal, comps, benefits, depts, desigs] = await Promise.all([
    supabase.from('employees').select('id, employee_code, full_name, department_id, designation_id, employment_status').eq('org_id', user.orgId).order('employee_code'),
    supabase.from('employee_salaries').select('employee_id, basic_salary, effective_from').eq('org_id', user.orgId).lte('effective_from', new Date().toISOString().slice(0, 10)).order('effective_from', { ascending: false }),
    supabase.from('salary_components').select('employee_id, kind, amount').eq('org_id', user.orgId).eq('is_active', true),
    supabase.from('employee_benefits').select('employee_id, plan_id').eq('org_id', user.orgId).eq('status', 'Active'),
    supabase.from('departments').select('id, name').eq('org_id', user.orgId),
    supabase.from('designations').select('id, title').eq('org_id', user.orgId)
  ]);
  const { data: plans } = await supabase.from('benefit_plans').select('id, amount, kind').eq('org_id', user.orgId).eq('kind', 'Allowance');
  const planAmt = new Map((plans || []).map((p) => [p.id, Number(p.amount)]));
  const dn = new Map((depts.data || []).map((d) => [d.id, d.name])), gn = new Map((desigs.data || []).map((d) => [d.id, d.title]));
  const cur = new Map();
  (sal.data || []).forEach((s) => { if (!cur.has(s.employee_id)) cur.set(s.employee_id, s); });
  const sum = (emp, kind) => money((comps.data || []).filter((c) => c.employee_id === emp && c.kind === kind).reduce((a, c) => a + Number(c.amount), 0));
  return (emps.data || []).map((e) => {
    const benefitAllow = (benefits.data || []).filter((b) => b.employee_id === e.id).reduce((a, b) => a + (planAmt.get(b.plan_id) || 0), 0);
    const basic = cur.get(e.id)?.basic_salary ?? null;
    const allowances = money(sum(e.id, 'Allowance') + benefitAllow), deductions = sum(e.id, 'Deduction');
    return { employeeId: e.id, employeeCode: e.employee_code, fullName: e.full_name, department: dn.get(e.department_id) || null, designation: gn.get(e.designation_id) || null, employmentStatus: e.employment_status, basicSalary: basic === null ? null : Number(basic), effectiveFrom: cur.get(e.id)?.effective_from || null, allowances, deductions, net: basic === null ? null : money(Number(basic) + allowances - deductions) };
  });
};

const setSalary = async ({ user, employeeId, basicSalary, effectiveFrom, note }) => {
  if (!UUID.test(employeeId || '')) throw httpErr('Select an employee.');
  const amt = Number(basicSalary);
  if (!Number.isFinite(amt) || amt < 0 || amt > 100000000) throw httpErr('Basic salary must be between 0 and 100,000,000.');
  if (Math.abs(Math.round(amt * 100) - amt * 100) > 1e-6) throw httpErr('Basic salary can have at most 2 decimals.');
  if (!validDate(effectiveFrom || '')) throw httpErr('Effective date must be valid (YYYY-MM-DD).');
  if (note && String(note).length > 300) throw httpErr('Note is too long.');
  const { data: emp } = await supabase.from('employees').select('id, user_id, full_name').eq('id', employeeId).eq('org_id', user.orgId).maybeSingle();
  if (!emp) throw httpErr('Employee not found.', 404);
  const { data, error } = await supabase.from('employee_salaries').insert({ org_id: user.orgId, employee_id: employeeId, basic_salary: amt, effective_from: effectiveFrom, note: note || null, created_by: user.id }).select().single();
  if (error) {
    if (error.code === '23505') throw httpErr('A salary with this effective date already exists for the employee.', 409);
    throw httpErr('Could not save salary.', 500);
  }
  await logAudit({ actor: user, orgId: user.orgId, action: 'salary.updated', entityType: 'employee', entityId: employeeId, entityLabel: emp.full_name });
  // Confidential: the notification never contains the amount.
  await notifyUser(user.orgId, emp.user_id, 'Salary Record Updated', 'Your salary record was updated by an administrator.', { dedupe_key: `salary:${data.id}` });
  return toApi(data);
};

// ---------------------------------------------------------------- runs
const buildRecords = async ({ user, run }) => {
  const orgId = user.orgId;
  const first = `${run.year}-${String(run.month).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(run.year, run.month, 0)).toISOString().slice(0, 10);
  const [emps, sal, comps, ben, plans, depts, desigs] = await Promise.all([
    supabase.from('employees').select('*').eq('org_id', orgId).in('employment_status', PAYABLE_STATUSES),
    supabase.from('employee_salaries').select('employee_id, basic_salary, effective_from').eq('org_id', orgId).lte('effective_from', last).order('effective_from', { ascending: false }),
    supabase.from('salary_components').select('employee_id, kind, amount').eq('org_id', orgId).eq('is_active', true),
    supabase.from('employee_benefits').select('employee_id, plan_id, start_date, end_date').eq('org_id', orgId).eq('status', 'Active').lte('start_date', last),
    supabase.from('benefit_plans').select('id, amount').eq('org_id', orgId).eq('kind', 'Allowance').eq('status', 'Active'),
    supabase.from('departments').select('id, name').eq('org_id', orgId),
    supabase.from('designations').select('id, title').eq('org_id', orgId)
  ]);
  for (const r of [emps, sal, comps, ben, plans]) if (r.error) throw httpErr('Could not read payroll inputs.', 500);
  const dn = new Map(depts.data.map((d) => [d.id, d.name])), gn = new Map(desigs.data.map((d) => [d.id, d.title]));
  const planAmt = new Map(plans.data.map((p) => [p.id, Number(p.amount)]));
  const cur = new Map();
  sal.data.forEach((s) => { if (!cur.has(s.employee_id)) cur.set(s.employee_id, s); });

  const records = [], skipped = [];
  for (const e of emps.data) {
    if (e.joining_date && e.joining_date > last) continue; // not yet joined that month
    const s = cur.get(e.id);
    if (!s) { skipped.push({ employeeCode: e.employee_code, fullName: e.full_name, reason: 'No salary structure' }); continue; }
    const compAllow = comps.data.filter((c) => c.employee_id === e.id && c.kind === 'Allowance').reduce((a, c) => a + Number(c.amount), 0);
    const benAllow = ben.data.filter((b) => b.employee_id === e.id && (!b.end_date || b.end_date >= first)).reduce((a, b) => a + (planAmt.get(b.plan_id) || 0), 0);
    const ded = comps.data.filter((c) => c.employee_id === e.id && c.kind === 'Deduction').reduce((a, c) => a + Number(c.amount), 0);
    const basic = Number(s.basic_salary), allow = money(compAllow + benAllow);
    const dd = Math.min(money(ded), money(basic + allow)); // net can never go negative
    records.push({ org_id: orgId, run_id: run.id, employee_id: e.id, employee_code: e.employee_code, employee_name: e.full_name, department_id: e.department_id, department_name: dn.get(e.department_id) || null, designation_title: gn.get(e.designation_id) || null, basic_salary: basic, allowances: allow, deductions: dd, payroll_month: run.month, payroll_year: run.year });
  }
  return { records, skipped };
};

const refreshTotals = async (orgId, runId) => {
  const { data } = await supabase.from('payroll_records').select('gross_salary, deductions, net_salary').eq('run_id', runId).eq('org_id', orgId);
  const t = (data || []).reduce((a, r) => ({ g: a.g + Number(r.gross_salary), d: a.d + Number(r.deductions), n: a.n + Number(r.net_salary) }), { g: 0, d: 0, n: 0 });
  await supabase.from('payroll_runs').update({ total_gross: money(t.g), total_deductions: money(t.d), total_net: money(t.n) }).eq('id', runId).eq('org_id', orgId);
};

const getRun = async (user, id) => {
  if (!UUID.test(id || '')) throw httpErr('Invalid payroll run.');
  const { data } = await supabase.from('payroll_runs').select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!data) throw httpErr('Payroll run not found.', 404);
  return data;
};

const listRuns = async ({ user }) => {
  const { data, error } = await supabase.from('payroll_runs').select('*').eq('org_id', user.orgId).order('year', { ascending: false }).order('month', { ascending: false });
  if (error) throw httpErr('Could not load payroll runs.', 500);
  const ids = data.map((r) => r.id);
  const { data: tx } = ids.length ? await supabase.from('finance_transactions').select('source_id, amount').eq('org_id', user.orgId).eq('source_type', 'payroll_run').in('source_id', ids) : { data: [] };
  const ledger = new Map((tx || []).map((t) => [t.source_id, Number(t.amount)]));
  return data.map((r) => ({ ...toApi(r), period: period(r.month, r.year), ledgerAmount: ledger.has(r.id) ? ledger.get(r.id) : null, synced: ledger.has(r.id), consistent: ledger.has(r.id) ? Math.abs(ledger.get(r.id) - Number(r.total_gross)) < 0.005 : null }));
};

const createRun = async ({ user, month, year }) => {
  const p = checkPeriod(month, year);
  const { data: run, error } = await supabase.from('payroll_runs').insert({ org_id: user.orgId, ...p }).select().single();
  if (error) {
    if (error.code === '23505') throw httpErr(`A payroll run for ${period(p.month, p.year)} already exists.`, 409);
    throw httpErr('Could not create payroll run.', 500);
  }
  const { records, skipped } = await buildRecords({ user, run });
  if (!records.length) {
    await supabase.from('payroll_runs').delete().eq('id', run.id);
    throw httpErr('No employees with a salary structure are payable for this month. Set salaries first.', 400);
  }
  const { error: e2 } = await supabase.from('payroll_records').insert(records);
  if (e2) { await supabase.from('payroll_runs').delete().eq('id', run.id); throw httpErr('Could not generate payroll records.', 500); }
  await refreshTotals(user.orgId, run.id);
  return { run: toApi((await getRun(user, run.id))), count: records.length, skipped };
};

const regenerate = async ({ user, id }) => {
  const run = await getRun(user, id);
  if (run.status !== 'Draft') throw httpErr('Only draft payroll runs can be regenerated.', 409);
  await supabase.from('payroll_records').delete().eq('run_id', id).eq('org_id', user.orgId);
  const { records, skipped } = await buildRecords({ user, run });
  if (records.length) {
    const { error } = await supabase.from('payroll_records').insert(records);
    if (error) throw httpErr('Could not regenerate payroll records.', 500);
  }
  await refreshTotals(user.orgId, id);
  return { count: records.length, skipped };
};

const deleteRun = async ({ user, id }) => {
  const run = await getRun(user, id);
  if (run.status !== 'Draft') throw httpErr('Only draft payroll runs can be deleted.', 409);
  const { error } = await supabase.from('payroll_runs').delete().eq('id', id).eq('org_id', user.orgId).eq('status', 'Draft');
  if (error) throw httpErr('Could not delete payroll run.', 500);
};

const listRecords = async ({ user, id }) => {
  await getRun(user, id);
  const { data, error } = await supabase.from('payroll_records').select('*').eq('run_id', id).eq('org_id', user.orgId).order('employee_code');
  if (error) throw httpErr('Could not load payroll records.', 500);
  return data.map(toApi);
};

const adjustRecord = async ({ user, id, allowances, deductions }) => {
  const { data: rec } = await supabase.from('payroll_records').select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!rec) throw httpErr('Payroll record not found.', 404);
  const run = await getRun(user, rec.run_id);
  if (run.status !== 'Draft') throw httpErr('Only records of a draft run can be adjusted.', 409);
  const patch = {};
  for (const [k, v] of [['allowances', allowances], ['deductions', deductions]]) {
    if (v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100000000) throw httpErr(`${k} must be a non-negative amount.`);
    patch[k] = money(n);
  }
  if (!Object.keys(patch).length) throw httpErr('Nothing to update.');
  const { error } = await supabase.from('payroll_records').update(patch).eq('id', id).eq('org_id', user.orgId);
  if (error) throw httpErr(error.code === '23514' ? 'Deductions cannot exceed gross salary.' : 'Could not adjust the record.', error.code === '23514' ? 400 : 500);
  await refreshTotals(user.orgId, rec.run_id);
};

const syncToFinance = async (user, runId) => {
  const { data, error } = await supabase.rpc('ws_sync_payroll_run', { p_run: runId, p_org: user.orgId });
  if (error) throw httpErr('Could not sync payroll to finance.', 500);
  return data;
};

const processRun = async ({ user, id }) => {
  const run = await getRun(user, id);
  if (run.status !== 'Draft') throw httpErr(`This payroll run is already ${run.status.toLowerCase()}.`, 409);
  const { data: claimed } = await supabase.from('payroll_runs').update({ status: 'Processed', processed_by: user.id, processed_at: new Date().toISOString() }).eq('id', id).eq('org_id', user.orgId).eq('status', 'Draft').select().maybeSingle();
  if (!claimed) throw httpErr('This payroll run was just processed by someone else.', 409);
  const ledgerId = await syncToFinance(user, id);
  const { data: recs } = await supabase.from('payroll_records').select('employee_id').eq('run_id', id);
  const { data: emps } = await supabase.from('employees').select('id, user_id').eq('org_id', user.orgId).in('id', (recs || []).map((r) => r.employee_id));
  const label = period(run.month, run.year);
  await notifyAdmins(user.orgId, 'Payroll Processed', `Payroll for ${label} was processed (${recs.length} employees) and posted to finance.`, { dedupe_key: `payroll:processed:${id}` });
  for (const e of emps || []) await notifyUser(user.orgId, e.user_id, 'Salary Processed', `Your salary for ${label} has been processed.`, { dedupe_key: `payroll:processed:${id}:${e.id}` });
  await logAudit({ actor: user, orgId: user.orgId, action: 'payroll.processed', entityType: 'payroll_run', entityId: id, entityLabel: label });
  return { ledgerTransactionId: ledgerId };
};

const markPaid = async ({ user, recordIds, runId, paymentDate, transactionReference }) => {
  if (!validDate(paymentDate || '')) throw httpErr('Payment date must be valid (YYYY-MM-DD).');
  if (transactionReference && String(transactionReference).length > 100) throw httpErr('Transaction reference is too long.');
  const run = await getRun(user, runId);
  if (run.status === 'Draft') throw httpErr('Process the payroll run before recording payments.', 409);
  let q = supabase.from('payroll_records').update({ payment_status: 'Paid', payment_date: paymentDate, transaction_reference: transactionReference || null }).eq('org_id', user.orgId).eq('run_id', runId).neq('payment_status', 'Paid');
  if (recordIds) {
    if (!Array.isArray(recordIds) || !recordIds.length || recordIds.some((x) => !UUID.test(x))) throw httpErr('Invalid records selected.');
    q = q.in('id', recordIds);
  }
  const { data, error } = await q.select('id');
  if (error) throw httpErr('Could not record payment.', 500);
  const { count } = await supabase.from('payroll_records').select('id', { count: 'exact', head: true }).eq('run_id', runId).neq('payment_status', 'Paid');
  if (count === 0) await supabase.from('payroll_runs').update({ status: 'Paid' }).eq('id', runId).eq('org_id', user.orgId);
  return { updated: data.length, runStatus: count === 0 ? 'Paid' : 'Processed' };
};

const syncRun = async ({ user, id }) => {
  const run = await getRun(user, id);
  if (run.status === 'Draft') throw httpErr('Process the payroll run first.', 409);
  return { ledgerTransactionId: await syncToFinance(user, id) };
};

// ---------------------------------------------------------------- CSV export
const COLUMNS = ['Employee ID', 'Employee Name', 'Department', 'Designation', 'Basic Salary', 'Allowances', 'Deductions', 'Gross Salary', 'Net Salary', 'Payroll Month', 'Payroll Year', 'Payment Date', 'Payment Status', 'Transaction Reference'];

// Quote per RFC 4180 and neutralise spreadsheet formulas (CSV/formula injection).
const textCell = (v) => {
  if (v === null || v === undefined) return '';
  let s = String(v).normalize('NFC');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const numCell = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(2));

const parseFilters = (q) => {
  const f = {};
  if (q.month) { f.month = Number(q.month); if (!Number.isInteger(f.month) || f.month < 1 || f.month > 12) throw httpErr('Invalid month.'); }
  if (q.year) { f.year = Number(q.year); if (!Number.isInteger(f.year) || f.year < 2000 || f.year > 2100) throw httpErr('Invalid year.'); }
  for (const k of ['departmentId', 'employeeId']) if (q[k]) { if (!UUID.test(q[k])) throw httpErr(`Invalid ${k}.`); f[k] = q[k]; }
  if (q.paymentStatus) { if (!['Pending', 'Paid', 'Failed'].includes(q.paymentStatus)) throw httpErr('Invalid payment status.'); f.paymentStatus = q.paymentStatus; }
  return f;
};

const applyFilters = (q, orgId, f) => {
  q = q.eq('org_id', orgId); // tenant isolation: always the caller's own organization
  if (f.month) q = q.eq('payroll_month', f.month);
  if (f.year) q = q.eq('payroll_year', f.year);
  if (f.departmentId) q = q.eq('department_id', f.departmentId);
  if (f.employeeId) q = q.eq('employee_id', f.employeeId);
  if (f.paymentStatus) q = q.eq('payment_status', f.paymentStatus);
  return q;
};

const csvFileName = (f) => {
  if (f.month && f.year) return `Payroll_${MONTHS[f.month - 1]}_${f.year}.csv`;
  if (f.year) return `Payroll_${f.year}.csv`;
  if (f.month) return `Payroll_${MONTHS[f.month - 1]}_AllYears.csv`;
  return 'Payroll_All_Records.csv';
};

const listPayrollRecords = async ({ user, query }) => {
  const f = parseFilters(query);
  const { data, error } = await applyFilters(supabase.from('payroll_records').select('*'), user.orgId, f).order('payroll_year', { ascending: false }).order('payroll_month', { ascending: false }).order('employee_code').limit(2000);
  if (error) throw httpErr('Could not load payroll records.', 500);
  return data.map(toApi);
};

const exportCsv = async ({ user, query, res }) => {
  const f = parseFilters(query);
  const { count, error: cErr } = await applyFilters(supabase.from('payroll_records').select('id', { count: 'exact', head: true }), user.orgId, f);
  if (cErr) throw httpErr('Could not prepare the export.', 500);
  if (!count) throw httpErr('No payroll records are available for the selected filters.', 404);

  const name = csvFileName(f);
  res.status(200);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.write('\uFEFF' + COLUMNS.join(',') + '\r\n'); // UTF-8 BOM so Excel reads names correctly

  const PAGE = 1000;
  let sent = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await applyFilters(supabase.from('payroll_records').select('*'), user.orgId, f)
      .order('payroll_year').order('payroll_month').order('employee_code').order('id').range(from, from + PAGE - 1);
    if (error) { res.destroy(new Error('export failed')); return null; } // never send a silently truncated file
    if (!data.length) break;
    let chunk = '';
    for (const r of data) {
      chunk += [textCell(r.employee_code), textCell(r.employee_name), textCell(r.department_name), textCell(r.designation_title),
        numCell(r.basic_salary), numCell(r.allowances), numCell(r.deductions), numCell(r.gross_salary), numCell(r.net_salary),
        MONTHS[r.payroll_month - 1], r.payroll_year, r.payment_date || '', textCell(r.payment_status), textCell(r.transaction_reference)].join(',') + '\r\n';
    }
    res.write(chunk);
    sent += data.length;
    if (data.length < PAGE) break;
  }
  res.end();
  await notifyUser(user.orgId, user.id, 'Payroll CSV Export Completed', `${name} was downloaded (${sent} records).`, { dedupe_key: `payroll:export:${user.id}:${Date.now()}` });
  await logAudit({ actor: user, orgId: user.orgId, action: 'payroll.exported', entityType: 'payroll_records', entityId: null, entityLabel: `${name} (${sent} rows)` });
  return { sent, name };
};

module.exports = { listSalaries, salaryOverview, setSalary, listRuns, createRun, regenerate, deleteRun, listRecords, adjustRecord, processRun, markPaid, syncRun, listPayrollRecords, exportCsv, csvFileName, textCell, COLUMNS };
