const supabase = require('../config/supabase');

const iso = (d) => d.toISOString().slice(0, 10);
const monthKey = (d) => d.toISOString().slice(0, 7);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const rows = (r) => r?.data || [];

// One org-scoped read-only snapshot for the Analytics & Reports page.
const getHrInsights = async ({ orgId }) => {
  const today = new Date();
  const todayStr = iso(today);
  const first6 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(first6.getUTCFullYear(), first6.getUTCMonth() + i, 1)));

  const [emps, depts, sessions, leaves, fin, runs, goals, enr, ints, ben, plans] = await Promise.all([
    supabase.from('employees').select('id, user_id, department_id, employment_status').eq('org_id', orgId).limit(5000),
    supabase.from('departments').select('id, name').eq('org_id', orgId),
    supabase.from('attendance_sessions').select('user_id, status').eq('org_id', orgId).eq('work_date', todayStr),
    supabase.from('leave_requests').select('user_id, status, start_date, end_date').eq('org_id', orgId).in('status', ['Pending', 'Approved']).limit(5000),
    supabase.from('finance_transactions').select('txn_date, type, amount, source_type').eq('org_id', orgId).gte('txn_date', iso(first6)).limit(20000),
    supabase.from('payroll_runs').select('month, year, total_net, status').eq('org_id', orgId).gte('year', first6.getUTCFullYear()).limit(100),
    supabase.from('performance_goals').select('status').eq('org_id', orgId).limit(20000),
    supabase.from('training_enrollments').select('status').eq('org_id', orgId).limit(20000),
    supabase.from('training_interests').select('id').eq('org_id', orgId).limit(20000),
    supabase.from('employee_benefits').select('status').eq('org_id', orgId).limit(20000),
    supabase.from('benefit_plans').select('id').eq('org_id', orgId).limit(1)
  ]);
  void plans;

  const active = rows(emps).filter((e) => !['Resigned', 'Terminated'].includes(e.employment_status));
  const onLeaveIds = new Set(rows(leaves).filter((l) => l.status === 'Approved' && l.start_date <= todayStr && l.end_date >= todayStr).map((l) => l.user_id));
  const present = new Set(rows(sessions).filter((s) => ['Present', 'Late', 'Half Day', 'Incomplete'].includes(s.status)).map((s) => s.user_id));
  const late = rows(sessions).filter((s) => s.status === 'Late').length;
  const onLeave = active.filter((e) => onLeaveIds.has(e.user_id) && !present.has(e.user_id)).length;
  const presentN = active.filter((e) => present.has(e.user_id)).length;
  const absent = Math.max(active.length - presentN - onLeave, 0);

  const deptName = new Map(rows(depts).map((d) => [d.id, d.name]));
  const byDept = {};
  active.forEach((e) => { const n = deptName.get(e.department_id) || 'Unassigned'; byDept[n] = (byDept[n] || 0) + 1; });

  const trend = months.map((m) => ({ key: monthKey(m), month: MONTHS[m.getUTCMonth()], income: 0, expense: 0, payroll: 0 }));
  const tIdx = new Map(trend.map((t, i) => [t.key, i]));
  rows(fin).forEach((t) => {
    const i = tIdx.get(String(t.txn_date).slice(0, 7));
    if (i === undefined) return;
    const v = Number(t.amount);
    if (t.type === 'Income') trend[i].income += v;
    else if (t.source_type === 'payroll_run') trend[i].payroll += v;
    else trend[i].expense += v;
  });
  rows(runs).forEach((r) => {
    if (!['Processed', 'Paid'].includes(r.status)) return;
    const i = tIdx.get(`${r.year}-${String(r.month).padStart(2, '0')}`);
    if (i !== undefined && !trend[i].payroll) trend[i].payroll = Number(r.total_net);
  });
  trend.forEach((t) => { t.income = Math.round(t.income); t.expense = Math.round(t.expense); t.payroll = Math.round(t.payroll); });
  const cur = trend[trend.length - 1];

  const count = (list, key) => list.reduce((m, x) => ((m[x[key]] = (m[x[key]] || 0) + 1), m), {});
  const gCount = count(rows(goals), 'status');
  const eCount = count(rows(enr), 'status');
  const totalGoals = rows(goals).filter((g) => g.status !== 'Cancelled').length;
  const enrolledTotal = rows(enr).filter((e) => e.status !== 'Dropped').length;

  return {
    cards: {
      headcount: active.length,
      attendanceRate: pct(presentN, Math.max(active.length - onLeave, 0)),
      onLeaveToday: onLeave,
      pendingLeave: rows(leaves).filter((l) => l.status === 'Pending').length,
      incomeThisMonth: cur.income,
      expenseThisMonth: cur.expense,
      payrollThisMonth: cur.payroll,
      goalCompletionRate: pct(gCount.Completed || 0, totalGoals),
      trainingCompletionRate: pct(eCount.Completed || 0, enrolledTotal),
      trainingInterest: rows(ints).length,
      activeBenefits: rows(ben).filter((b) => b.status === 'Active').length
    },
    charts: {
      headcountByDepartment: Object.entries(byDept).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      attendanceToday: [
        { name: 'Present', value: presentN - late }, { name: 'Late', value: late },
        { name: 'On Leave', value: onLeave }, { name: 'Absent', value: absent }
      ],
      financeTrend: trend.map(({ month, income, expense, payroll }) => ({ month, income, expense, payroll })),
      goalsByStatus: ['Not Started', 'In Progress', 'Completed', 'Cancelled'].map((name) => ({ name, value: gCount[name] || 0 })),
      trainingBreakdown: ['Enrolled', 'In Progress', 'Completed', 'Dropped'].map((name) => ({ name, value: eCount[name] || 0 }))
    }
  };
};

module.exports = { getHrInsights };
