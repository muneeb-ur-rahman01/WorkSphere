import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Users,
  CheckSquare,
  UserPlus,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const RANGE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

const RANGE_CAPTION = {
  weekly: 'Last 7 days',
  monthly: 'Last 6 weeks',
  yearly: 'Last 12 months'
};

const PIE_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899'
];

const Analytics = () => {
  const { getOrgAnalytics } = useContext(AppContext);

  const [range, setRange] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    getOrgAnalytics(range).then((res) => {
      if (cancelled) return;

      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Could not load analytics.');
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const kpis = data?.kpis || {};
  const trend = data?.trend || [];

  const personnelByRole = data?.personnelByRole || [];
  const eventsByType = data?.eventsByType || [];
  const taskStatusBreakdown = data?.taskStatusBreakdown || [];

  // ============================================================
  // KPI CARDS
  // ============================================================

  const kpiCards = [
    {
      label: 'Total Camps',
      value: kpis.totalCamps ?? 0,
      icon: Calendar,
      accent: 'from-blue-500 to-cyan-500',
      sub: `${kpis.periodCamps ?? 0} scheduled ${RANGE_CAPTION[
        range
      ].toLowerCase()}`
    },

    {
      label: 'Total Events',
      value: kpis.totalEvents ?? 0,
      icon: CalendarDays,
      accent: 'from-fuchsia-500 to-purple-500',
      sub: `${kpis.periodEvents ?? 0} scheduled ${RANGE_CAPTION[
        range
      ].toLowerCase()}`
    },

    // =========================
    // NEW: MEETINGS
    // =========================
    {
      label: 'Total Meetings',
      value: kpis.totalMeetings ?? 0,
      icon: CalendarDays,
      accent: 'from-emerald-500 to-teal-500',
      sub: `${kpis.periodMeetings ?? 0} scheduled ${RANGE_CAPTION[
        range
      ].toLowerCase()}`
    },

    {
      label: 'Total Users',
      value: kpis.totalUsers ?? 0,
      icon: Users,
      accent: 'from-indigo-500 to-indigo-600',
      sub: `${kpis.activeUsers ?? 0} active • ${
        kpis.pendingUsers ?? 0
      } pending`
    },

    {
      label: 'New Users',
      value: kpis.periodNewUsers ?? 0,
      icon: UserPlus,
      accent: 'from-amber-500 to-orange-500',
      sub: `Joined ${RANGE_CAPTION[range].toLowerCase()}`
    },

    {
      label: 'Task Completion',
      value: `${kpis.taskCompletionRate ?? 0}%`,
      icon: CheckSquare,
      accent: 'from-emerald-500 to-green-600',
      sub: `${kpis.completedTasks ?? 0} of ${
        kpis.totalTasks ?? 0
      } tasks completed`
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 bg-gradient-to-br from-slate-50 to-indigo-50/40 min-h-screen p-8 -m-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 p-8 shadow-xl flex-1">

            <div className="absolute -right-10 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />

            <div className="absolute -left-10 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-3">

              <div className="bg-white/15 text-white rounded-xl p-3">
                <BarChart3 size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white">
                  Analytics & Reports
                </h1>

                <p className="text-indigo-100 mt-1 max-w-xl">
                  Track camps, events, meetings, personnel and task
                  progress for your organization.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* =====================================================
            RANGE SWITCHER
        ====================================================== */}

        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-2 w-fit">

          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition ${
                range === opt.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <span className="text-xs text-gray-400 px-3 hidden sm:inline">
            {RANGE_CAPTION[range]}
          </span>

        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl p-4">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* =====================================================
            LOADING
        ====================================================== */}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2
              className="animate-spin text-indigo-600"
              size={36}
            />
          </div>
        ) : (
          <>

            {/* =================================================
                KPI CARDS
            ================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6">

              {kpiCards.map((card, idx) => {
                const Icon = card.icon;

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        {card.label}
                      </span>

                      <div
                        className={`bg-gradient-to-br ${card.accent} text-white rounded-xl p-2 shadow-md`}
                      >
                        <Icon size={18} />
                      </div>

                    </div>

                    <h2 className="text-4xl font-extrabold text-black mt-4">
                      {card.value}
                    </h2>

                    <p className="text-sm mt-2 text-gray-600">
                      {card.sub}
                    </p>

                  </div>
                );
              })}

            </div>

            {/* =================================================
                CAMPS / EVENTS / MEETINGS TREND
            ================================================== */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

              <div className="mb-4">

                <h2 className="text-xl font-bold text-black">
                  Camps, Events & Meetings Progress
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  Number of camps, events and meetings scheduled per
                  period ({RANGE_CAPTION[range].toLowerCase()})
                </p>

              </div>

              <ResponsiveContainer width="100%" height={300}>

                <AreaChart
                  data={trend}
                  margin={{
                    top: 10,
                    right: 20,
                    left: -10,
                    bottom: 0
                  }}
                >

                  <defs>

                    <linearGradient
                      id="colorCamps"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.5}
                      />

                      <stop
                        offset="95%"
                        stopColor="#0ea5e9"
                        stopOpacity={0}
                      />
                    </linearGradient>

                    <linearGradient
                      id="colorEvents"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#a855f7"
                        stopOpacity={0.5}
                      />

                      <stop
                        offset="95%"
                        stopColor="#a855f7"
                        stopOpacity={0}
                      />
                    </linearGradient>

                    {/* Meetings gradient */}
                    <linearGradient
                      id="colorMeetings"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.5}
                      />

                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0}
                      />
                    </linearGradient>

                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="camps"
                    name="Camps"
                    stroke="#0ea5e9"
                    fill="url(#colorCamps)"
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="#a855f7"
                    fill="url(#colorEvents)"
                    strokeWidth={2}
                  />

                  {/* NEW: Meetings */}
                  <Area
                    type="monotone"
                    dataKey="meetings"
                    name="Meetings"
                    stroke="#10b981"
                    fill="url(#colorMeetings)"
                    strokeWidth={2}
                  />

                </AreaChart>

              </ResponsiveContainer>

            </div>

            {/* =================================================
                USER GROWTH
            ================================================== */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

              <div className="mb-4">

                <h2 className="text-xl font-bold text-black">
                  User Growth & Activity
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  New sign-ups per period (bars) vs. total
                  personnel over time (line)
                </p>

              </div>

              <ResponsiveContainer width="100%" height={300}>

                <ComposedChart
                  data={trend}
                  margin={{
                    top: 10,
                    right: 20,
                    left: -10,
                    bottom: 0
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="newUsers"
                    name="New Users"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />

                  <Line
                    type="monotone"
                    dataKey="totalUsers"
                    name="Total Users"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />

                </ComposedChart>

              </ResponsiveContainer>

            </div>

            {/* =================================================
                BREAKDOWN ROW
            ================================================== */}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

              {/* =================================================
                  PERSONNEL BY ROLE
              ================================================== */}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

                <h2 className="text-lg font-bold text-black mb-1">
                  Personnel by Role
                </h2>

                <p className="text-xs text-gray-500 mb-4">
                  Active staff breakdown
                </p>

                {personnelByRole.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>

                    <BarChart
                      data={personnelByRole}
                      layout="vertical"
                      margin={{ left: 10 }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                      />

                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis
                        type="category"
                        dataKey="key"
                        tick={{ fontSize: 11 }}
                        width={90}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="count"
                        name="Staff"
                        fill="#4f46e5"
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                      />

                    </BarChart>

                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-16 text-center">
                    No active personnel yet.
                  </p>
                )}

              </div>

              {/* =================================================
                  EVENTS BY TYPE
              ================================================== */}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

                <h2 className="text-lg font-bold text-black mb-1">
                  Events by Type
                </h2>

                <p className="text-xs text-gray-500 mb-4">
                  All-time distribution
                </p>

                {eventsByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>

                    <PieChart>

                      <Pie
                        data={eventsByType}
                        dataKey="count"
                        nameKey="key"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >

                        {eventsByType.map((entry, idx) => (
                          <Cell
                            key={entry.key}
                            fill={
                              PIE_COLORS[
                                idx % PIE_COLORS.length
                              ]
                            }
                          />
                        ))}

                      </Pie>

                      <Tooltip />

                      <Legend
                        wrapperStyle={{
                          fontSize: 11
                        }}
                      />

                    </PieChart>

                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-16 text-center">
                    No events created yet.
                  </p>
                )}

              </div>

              {/* =================================================
                  TASK STATUS
              ================================================== */}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

                <h2 className="text-lg font-bold text-black mb-1">
                  Task Status
                </h2>

                <p className="text-xs text-gray-500 mb-4">
                  All-time distribution
                </p>

                {taskStatusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>

                    <PieChart>

                      <Pie
                        data={taskStatusBreakdown}
                        dataKey="count"
                        nameKey="key"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >

                        {taskStatusBreakdown.map((entry, idx) => (
                          <Cell
                            key={entry.key}
                            fill={
                              PIE_COLORS[
                                (idx + 2) %
                                  PIE_COLORS.length
                              ]
                            }
                          />
                        ))}

                      </Pie>

                      <Tooltip />

                      <Legend
                        wrapperStyle={{
                          fontSize: 11
                        }}
                      />

                    </PieChart>

                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-16 text-center">
                    No tasks created yet.
                  </p>
                )}

              </div>

            </div>

          </>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Analytics;