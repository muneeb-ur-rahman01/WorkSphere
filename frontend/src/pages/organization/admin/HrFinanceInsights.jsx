import { useEffect, useState } from 'react';
import { Users, UserCheck, CalendarOff, Wallet, Target, GraduationCap, Gift, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import api from '../../../Config/apiConfig';
import { apiError } from '../../../utils/hrFormat';

const COLORS = ['#2563eb', '#f59e0b', '#a3b018', '#dc2626', '#10b981', '#7c3aed'];
const num = (n) => Number(n || 0).toLocaleString();

const Stat = ({ icon, label, value, hint, tone }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
    <div className={`rounded-xl p-2.5 ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  </div>
);

const Panel = ({ title, children, empty }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
    {empty ? <p className="text-sm text-gray-400 text-center py-10">No data yet</p> : <div className="h-64">{children}</div>}
  </div>
);

const Donut = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
        {data.filter((d) => d.value > 0).map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip /><Legend />
    </PieChart>
  </ResponsiveContainer>
);

// HR + finance snapshot for the org admin Analytics & Reports page.
const HrFinanceInsights = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    api.get('/analytics/hr-insights').then((r) => { if (alive) setData(r.data.insights); }).catch((e) => { if (alive) setError(apiError(e, 'Could not load HR insights.')); });
    return () => { alive = false; };
  }, []);

  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-400">Loading HR & finance insights…</p>;
  const { cards: c, charts: ch } = data;
  const sum = (d) => d.reduce((s, x) => s + x.value, 0);

  return (
    <section aria-label="HR and finance insights" className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">HR & Finance Insights</h2>
        <p className="text-sm text-gray-500">Live snapshot of your people, goals, training and money.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={<Users size={18} />} tone="bg-blue-50 text-blue-600" label="Headcount" value={num(c.headcount)} />
        <Stat icon={<UserCheck size={18} />} tone="bg-green-50 text-green-600" label="Attendance today" value={`${c.attendanceRate}%`} hint="Approved leave not counted as absent" />
        <Stat icon={<CalendarOff size={18} />} tone="bg-lime-50 text-lime-700" label="On leave today" value={num(c.onLeaveToday)} hint={`${num(c.pendingLeave)} request(s) pending`} />
        <Stat icon={<Wallet size={18} />} tone="bg-emerald-50 text-emerald-600" label="Income this month" value={num(c.incomeThisMonth)} />
        <Stat icon={<TrendingUp size={18} />} tone="bg-rose-50 text-rose-600" label="Expenses this month" value={num(c.expenseThisMonth)} hint={`Payroll ${num(c.payrollThisMonth)}`} />
        <Stat icon={<Target size={18} />} tone="bg-indigo-50 text-indigo-600" label="Goal completion" value={`${c.goalCompletionRate}%`} />
        <Stat icon={<GraduationCap size={18} />} tone="bg-pink-50 text-pink-600" label="Training completion" value={`${c.trainingCompletionRate}%`} hint={`${num(c.trainingInterest)} interested`} />
        <Stat icon={<Gift size={18} />} tone="bg-sky-50 text-sky-600" label="Active benefits" value={num(c.activeBenefits)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Income vs expenses vs payroll (6 months)" empty={!ch.financeTrend.some((m) => m.income || m.expense || m.payroll)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ch.financeTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payroll" name="Payroll" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Attendance today" empty={!sum(ch.attendanceToday)}><Donut data={ch.attendanceToday} /></Panel>
        <Panel title="Headcount by department" empty={!ch.headcountByDepartment.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ch.headcountByDepartment} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} /><Tooltip />
              <Bar dataKey="value" name="Employees" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Goals by status" empty={!sum(ch.goalsByStatus)}><Donut data={ch.goalsByStatus} /></Panel>
        <Panel title="Training participation" empty={!sum(ch.trainingBreakdown)}><Donut data={ch.trainingBreakdown} /></Panel>
      </div>
    </section>
  );
};

export default HrFinanceInsights;
