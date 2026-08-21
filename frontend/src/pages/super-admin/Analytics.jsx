import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
  BarChart3, Building, Calendar, CalendarDays, Users, Loader2, AlertTriangle, Trophy
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
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

const STATUS_COLORS = {
  Active: '#10b981',
  Pending: '#f59e0b',
  Suspended: '#ef4444'
};

const Analytics = () => {
  const { getPlatformAnalytics } = useContext(AppContext);
  const [range, setRange] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPlatformAnalytics(range).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Could not load platform analytics.');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const kpis = data?.kpis || {};
  const trend = data?.trend || [];
  const topOrganizations = data?.topOrganizations || [];
  const orgStatusBreakdown = data?.orgStatusBreakdown || [];

  const kpiCards = [
    {
      label: 'Total Organizations', value: kpis.totalOrganizations ?? 0, icon: Building,
      accent: 'from-indigo-500 to-indigo-600',
      sub: `${kpis.activeOrganizations ?? 0} active • ${kpis.pendingOrganizations ?? 0} pending`
    },
    {
      label: 'Camps (Platform-wide)', value: kpis.totalCamps ?? 0, icon: Calendar,
      accent: 'from-blue-500 to-cyan-500',
      sub: `${kpis.periodCamps ?? 0} scheduled ${RANGE_CAPTION[range].toLowerCase()}`
    },
    {
      label: 'Events (Platform-wide)', value: kpis.totalEvents ?? 0, icon: CalendarDays,
      accent: 'from-fuchsia-500 to-purple-500',
      sub: `${kpis.periodEvents ?? 0} scheduled ${RANGE_CAPTION[range].toLowerCase()}`
    },
    {
      label: 'Users (Platform-wide)', value: kpis.totalUsers ?? 0, icon: Users,
      accent: 'from-emerald-500 to-green-600',
      sub: `${kpis.periodNewUsers ?? 0} new ${RANGE_CAPTION[range].toLowerCase()}`
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-800 via-indigo-800 to-purple-800 p-8 shadow-xl">
          <div className="absolute -right-10 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/15 text-white rounded-xl p-3">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
              <p className="text-indigo-100 mt-1 max-w-xl">
                Platform-wide activity across every organization on CampOS.
              </p>
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
                  ? 'bg-indigo-800 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="text-xs text-gray-400 px-3 hidden sm:inline">{RANGE_CAPTION[range]}</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl p-4">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-indigo-800" size={36} />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {kpiCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {card.label}
                    </span>
                    <div className={`bg-gradient-to-br ${card.accent} text-white rounded-xl p-2 shadow-md`}>
                      <card.icon size={18} />
                    </div>
                  </div>
                  <h2 className="text-4xl font-extrabold text-black mt-4">{card.value}</h2>
                  <p className="text-sm mt-2 text-gray-600">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Camps & Events Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-black">Platform Camps & Events Activity</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Camps and events scheduled across all organizations, per period ({RANGE_CAPTION[range].toLowerCase()})
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPCamps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="camps" name="Camps" stroke="#0ea5e9" fill="url(#colorPCamps)" strokeWidth={2} />
                  <Area type="monotone" dataKey="events" name="Events" stroke="#a855f7" fill="url(#colorPEvents)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Organization & User Growth */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-black">Organization Growth</h2>
                  <p className="text-xs text-gray-500 mt-1">New sign-ups (bars) vs. total organizations (line)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newOrganizations" name="New Orgs" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={24} />
                    <Line type="monotone" dataKey="totalOrganizations" name="Total Orgs" stroke="#1e293b" strokeWidth={3} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-black">Platform User Growth</h2>
                  <p className="text-xs text-gray-500 mt-1">New users (bars) vs. total users across all orgs (line)</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newUsers" name="New Users" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                    <Line type="monotone" dataKey="totalUsers" name="Total Users" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Org Status + Leaderboard */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
                <h2 className="text-lg font-bold text-black mb-1">Organization Status</h2>
                <p className="text-xs text-gray-500 mb-4">All-time distribution</p>
                {orgStatusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={orgStatusBreakdown} dataKey="count" nameKey="key" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {orgStatusBreakdown.map((entry) => (
                          <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-16 text-center">No organizations yet.</p>
                )}
              </div>

              {/* Most Active Organizations */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={18} className="text-amber-500" />
                  <h2 className="text-lg font-bold text-black">Most Active Organizations</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Ranked by total camps + events conducted</p>

                {topOrganizations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-100">
                          <th className="py-2 pr-4">Organization</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Camps</th>
                          <th className="py-2 pr-4">Events</th>
                          <th className="py-2 pr-4">Users</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topOrganizations.map((org, idx) => (
                          <tr key={org.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 pr-4 font-semibold text-black flex items-center gap-2">
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              {org.name}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  org.status === 'Active'
                                    ? 'bg-green-100 text-green-700'
                                    : org.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {org.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-gray-700">{org.camps}</td>
                            <td className="py-3 pr-4 text-gray-700">{org.events}</td>
                            <td className="py-3 pr-4 text-gray-700">{org.users}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-16 text-center">No organization activity yet.</p>
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
