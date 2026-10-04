import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck } from 'lucide-react';
import { STATE_META, fmtDuration } from '../../utils/hrFormat';

// Daily bar chart modelled on the reference "Attendance Flag Summary":
// one bar per day, bar height = hours worked, colour = attendance state.
// Days without worked hours (leave / absent / weekend) get a short stub bar
// so every day is visible and approved leave is clearly not an absence.
const STUB_HOURS = 1.5;
const LEGEND_ORDER = ['Present', 'Late', 'Half Day', 'Incomplete', 'Leave', 'Absent', 'Weekend'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const hhmm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-800">{d.full}</p>
      <p style={{ color: STATE_META[d.state]?.color }} className="font-medium">{d.state}</p>
      {d.workedSeconds > 0 && <p className="text-slate-600">Worked: {fmtDuration(d.workedSeconds)}</p>}
    </div>
  );
};

const AttendanceChart = ({ days = [], month, onMonthChange, maxMonth, title = 'Attendance Summary', loading = false, extraControls = null }) => {
  const data = useMemo(
    () =>
      days.map((d) => {
        const [y, m, dd] = d.date.split('-');
        const worked = d.workedSeconds || 0;
        return {
          label: `${dd}-${MONTHS[Number(m) - 1]}`,
          full: `${dd} ${MONTHS[Number(m) - 1]} ${y}`,
          state: d.state,
          workedSeconds: worked,
          hours: worked > 0 ? worked / 3600 : d.state === 'Upcoming' ? 0 : STUB_HOURS
        };
      }),
    [days]
  );

  const counts = useMemo(() => {
    const c = {};
    days.forEach((d) => { c[d.state] = (c[d.state] || 0) + 1; });
    return c;
  }, [days]);

  const attended = ['Present', 'Late', 'Half Day', 'Incomplete'].reduce((s, k) => s + (counts[k] || 0), 0);
  const totalWorked = days.reduce((s, d) => s + (d.workedSeconds || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-blue-700">
          <CalendarCheck size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraControls}
          <input
            type="month"
            value={month}
            max={maxMonth}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 bg-white"
            aria-label="Select month"
          />
        </div>
      </div>

      {/* legend with totals */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 pt-3">
        {LEGEND_ORDER.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: STATE_META[k].color }} />
            {STATE_META[k].label}
            <span className="font-semibold text-slate-900">({counts[k] || 0})</span>
          </span>
        ))}
      </div>

      <div className="px-2 pb-2 pt-2 relative" style={{ height: 300 }}>
        {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 bg-white/60 z-10">Loading…</div>}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }} barCategoryGap="12%">
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} angle={-45} textAnchor="end" height={54} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: '#475569' }} tickFormatter={hhmm} domain={[0, (max) => Math.max(10, Math.ceil(max))]} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={STATE_META[d.state]?.color || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
        <span>Days attended: <b className="text-slate-900">{attended}</b></span>
        <span>Leave: <b className="text-slate-900">{counts.Leave || 0}</b></span>
        <span>Absent: <b className="text-slate-900">{counts.Absent || 0}</b></span>
        <span>Total worked: <b className="text-slate-900">{fmtDuration(totalWorked)}</b></span>
      </div>
    </div>
  );
};

export default AttendanceChart;
