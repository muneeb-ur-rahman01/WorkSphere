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
  AlertTriangle,
  Video,
  Briefcase,
  FolderKanban,
  Megaphone,
  HeartHandshake,
  Gift,
  Handshake,
  Heart,
  Wallet,
  FileText,
  TrendingUp
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

// These keys exactly match the backend controller EXTRA_MODULES.
const EXTRA_MODULE_CARDS = [
  {
    key: 'meetings',
    label: 'Meetings',
    icon: Video,
    accent: 'from-sky-500 to-blue-600'
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
    icon: Briefcase,
    accent: 'from-teal-500 to-emerald-600'
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    accent: 'from-indigo-500 to-violet-600'
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    icon: Megaphone,
    accent: 'from-fuchsia-500 to-purple-500'
  },
  {
    key: 'donors',
    label: 'Donors',
    icon: HeartHandshake,
    accent: 'from-rose-500 to-pink-500'
  },
  {
    key: 'donations',
    label: 'Donations',
    icon: HeartHandshake,
    accent: 'from-pink-500 to-rose-600',
    amount: true
  },
  {
    key: 'sponsors',
    label: 'Sponsors',
    icon: Gift,
    accent: 'from-yellow-500 to-amber-600'
  },
  {
    key: 'sponsorships',
    label: 'Sponsorships',
    icon: Gift,
    accent: 'from-amber-500 to-yellow-600',
    amount: true
  },
  {
    key: 'partners',
    label: 'Partners',
    icon: Handshake,
    accent: 'from-cyan-500 to-teal-600'
  },
  {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    icon: Heart,
    accent: 'from-red-500 to-rose-600'
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: Wallet,
    accent: 'from-slate-500 to-gray-700',
    amount: true
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: FileText,
    accent: 'from-lime-500 to-green-600'
  }
];

const capitalize = (value = '') =>
  value.charAt(0).toUpperCase() + value.slice(1);

const formatNumber = (value) =>
  Number(value || 0).toLocaleString();

const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

const Analytics = () => {
  const { getOrgAnalytics } = useContext(AppContext);

  const [range, setRange] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /*
   * IMPORTANT:
   * Do NOT add getOrgAnalytics to this dependency array.
   *
   * If AppContext recreates getOrgAnalytics on every render,
   * using [range, getOrgAnalytics] can cause repeated requests
   * and an infinite loading/re-render cycle.
   */
  useEffect(() => {
  let cancelled = false;

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('ANALYTICS REQUEST START:', range);

      const res = await getOrgAnalytics(range);

      console.log('ANALYTICS RESPONSE:', res);

      if (cancelled) return;

      if (res?.success) {
        setData(res.data);
      } else {
        console.error('ANALYTICS API FAILED:', res);
        setError(res?.error || 'Could not load analytics.');
      }
    } catch (err) {
      console.error('ANALYTICS FRONTEND ERROR:', err);

      if (!cancelled) {
        setError(err?.message || 'Could not load analytics.');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadAnalytics();

  return () => {
    cancelled = true;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [range]);

  const kpis = data?.kpis || {};
  const trend = data?.trend || [];

  const personnelByRole =
    data?.personnelByRole || [];

  const eventsByType =
    data?.eventsByType || [];

  const taskStatusBreakdown =
    data?.taskStatusBreakdown || [];

  const kpiCards = [
    {
      label: 'Total Camps',
      value: formatNumber(kpis.totalCamps),
      icon: Calendar,
      accent: 'from-blue-500 to-cyan-500',
      sub: `${formatNumber(kpis.periodCamps)} scheduled ${RANGE_CAPTION[
        range
      ].toLowerCase()}`
    },
    {
      label: 'Total Events',
      value: formatNumber(kpis.totalEvents),
      icon: CalendarDays,
      accent: 'from-fuchsia-500 to-purple-500',
      sub: `${formatNumber(kpis.periodEvents)} scheduled ${RANGE_CAPTION[
        range
      ].toLowerCase()}`
    },
    {
      label: 'Total Users',
      value: formatNumber(kpis.totalUsers),
      icon: Users,
      accent: 'from-indigo-500 to-indigo-600',
      sub: `${formatNumber(kpis.activeUsers)} active • ${formatNumber(
        kpis.pendingUsers
      )} pending`
    },
    {
      label: 'New Users',
      value: formatNumber(kpis.periodNewUsers),
      icon: UserPlus,
      accent: 'from-amber-500 to-orange-500',
      sub: `Joined ${RANGE_CAPTION[range].toLowerCase()}`
    },
    {
      label: 'Task Completion',
      value: `${kpis.taskCompletionRate ?? 0}%`,
      icon: CheckSquare,
      accent: 'from-emerald-500 to-green-600',
      sub: `${formatNumber(kpis.completedTasks)} of ${formatNumber(
        kpis.totalTasks
      )} tasks completed`
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 bg-gradient-to-br from-slate-50 to-indigo-50/40 min-h-screen p-8 -m-8">

        {/* Header */}
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
                  Track camps, events, personnel, tasks and all organization
                  modules from one place.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Range Switcher */}
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

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl p-4">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2
              className="animate-spin text-indigo-600"
              size={36}
            />
          </div>
        ) : (
          <>
            {/* Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
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

            {/* Organization Module Cards */}
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-black">
                  Organization Modules
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  Total records and activity for the selected range.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {EXTRA_MODULE_CARDS.map((module) => {
                  const Icon = module.icon;
                  const capitalizedKey = capitalize(module.key);

                  const totalKey = `total${capitalizedKey}`;
                  const periodKey = `period${capitalizedKey}`;

                  const totalAmountKey =
                    `total${capitalizedKey}Amount`;

                  const periodAmountKey =
                    `period${capitalizedKey}Amount`;

                  return (
                    <div
                      key={module.key}
                      className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/30 p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            {module.label}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            All-time total
                          </p>
                        </div>

                        <div
                          className={`bg-gradient-to-br ${module.accent} text-white rounded-xl p-2.5 shadow-md`}
                        >
                          <Icon size={18} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-black">
                          {formatNumber(kpis[totalKey])}
                        </h3>

                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <TrendingUp
                            size={15}
                            className="text-emerald-500"
                          />

                          <span className="text-gray-600">
                            {formatNumber(kpis[periodKey])}{' '}
                            {module.label.toLowerCase()} in selected range
                          </span>
                        </div>

                        {module.amount && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                Total amount
                              </span>

                              <span className="text-sm font-bold text-gray-900">
                                {formatAmount(
                                  kpis[totalAmountKey]
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">
                                Selected range
                              </span>

                              <span className="text-sm font-bold text-indigo-600">
                                {formatAmount(
                                  kpis[periodAmountKey]
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Camps & Events Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-black">
                  Camps & Events Progress
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  Number of camps and events scheduled per period (
                  {RANGE_CAPTION[range].toLowerCase()})
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
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Module Activity Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-black">
                  Module Activity Trend
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  Activity across organization modules for the selected range.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={380}>
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
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip />
                  <Legend />

                  {EXTRA_MODULE_CARDS.map((module, index) => {
                    const lineColors = [
                      '#0ea5e9',
                      '#10b981',
                      '#4f46e5',
                      '#a855f7',
                      '#ec4899',
                      '#f43f5e',
                      '#f59e0b',
                      '#eab308',
                      '#14b8a6',
                      '#ef4444',
                      '#64748b',
                      '#84cc16'
                    ];

                    return (
                      <Line
                        key={module.key}
                        type="monotone"
                        dataKey={module.key}
                        name={module.label}
                        stroke={
                          lineColors[
                            index % lineColors.length
                          ]
                        }
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Financial Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-black">
                  Financial Activity
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  Donations, sponsorships and expenses amount by period.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
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
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />

                  <Tooltip
                    formatter={(value) => formatAmount(value)}
                  />

                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="donationsAmount"
                    name="Donations"
                    stroke="#ec4899"
                    fill="#ec4899"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="sponsorshipsAmount"
                    name="Sponsorships"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />

                  <Area
                    type="monotone"
                    dataKey="expensesAmount"
                    name="Expenses"
                    stroke="#64748b"
                    fill="#64748b"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* User Growth */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-black">
                  User Growth & Activity
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  New sign-ups per period (bars) vs. total personnel over
                  time (line)
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

            {/* Breakdown Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

              {/* Personnel by Role */}
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

              {/* Events by Type */}
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

              {/* Task Status */}
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
                                (idx + 2) % PIE_COLORS.length
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

            {/* Module Summary Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-black">
                  Module Summary
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  All module totals compared with the selected range.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        Module
                      </th>

                      <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        Total
                      </th>

                      <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        {capitalize(range)}
                      </th>

                      <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        Range %
                      </th>

                      <th className="text-right py-3 px-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {EXTRA_MODULE_CARDS.map((module) => {
                      const capitalizedKey =
                        capitalize(module.key);

                      const total = Number(
                        kpis[`total${capitalizedKey}`] || 0
                      );

                      const period = Number(
                        kpis[`period${capitalizedKey}`] || 0
                      );

                      const percentage =
                        total > 0
                          ? Math.round(
                              (period / total) * 100
                            )
                          : 0;

                      const totalAmount = module.amount
                        ? Number(
                            kpis[
                              `total${capitalizedKey}Amount`
                            ] || 0
                          )
                        : null;

                      const periodAmount = module.amount
                        ? Number(
                            kpis[
                              `period${capitalizedKey}Amount`
                            ] || 0
                          )
                        : null;

                      const Icon = module.icon;

                      return (
                        <tr
                          key={module.key}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70"
                        >
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`bg-gradient-to-br ${module.accent} text-white rounded-lg p-2`}
                              >
                                <Icon size={15} />
                              </div>

                              <span className="font-semibold text-gray-800">
                                {module.label}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-3 text-right font-bold text-gray-900">
                            {formatNumber(total)}
                          </td>

                          <td className="py-4 px-3 text-right font-semibold text-indigo-600">
                            {formatNumber(period)}
                          </td>

                          <td className="py-4 px-3 text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                              {percentage}%
                            </span>
                          </td>

                          <td className="py-4 px-3 text-right">
                            {module.amount ? (
                              <div>
                                <div className="font-bold text-gray-900">
                                  {formatAmount(totalAmount)}
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                  {formatAmount(
                                    periodAmount
                                  )}{' '}
                                  range
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
