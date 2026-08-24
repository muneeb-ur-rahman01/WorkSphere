import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, DollarSign, Users, Clock, Bell, AlertTriangle, PauseCircle } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { SUBSCRIPTION_PLANS } from '../../Config/constant';

const SuperAdminDashboard = () => {
  const { organizations, users, notifications } = useContext(AppContext);
  const navigate = useNavigate();

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.status === 'Active').length;
  const pendingOrgs = organizations.filter(o => o.status === 'Pending').length;
  const suspendedOrgs = organizations.filter(o => o.status === 'Suspended').length;
  const totalUsers = users.length;

  // Revenue based on each org's actual subscription plan price (falls back
  // to the plan catalogue if plan_price hasn't been synced yet).
  const monthlyRevenue = organizations
    .filter(o => o.status === 'Active' && o.paymentStatus === 'Paid')
    .reduce((acc, curr) => {
      const price = curr.planPrice || SUBSCRIPTION_PLANS[curr.subPlan]?.price || 0;
      return acc + price;
    }, 0);

  // Get recent 5 organizations for the overview table
  const recentOrgs = [...organizations].reverse().slice(0, 5);

  // Platform-wide alerts (org_id = null): subscription expiry warnings etc.
  const platformAlerts = notifications.filter(n => n.orgId === null).slice(0, 6);

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-800 via-indigo-800 to-purple-800 p-8 shadow-xl mb-8">
        <div className="absolute -right-10 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white">
            Super Admin Portal
          </h1>
          <p className="text-indigo-100 mt-2 max-w-xl">
            Overview of SaaS health, subscription volumes, and pending NGO requests.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">

        {[
          {
            label: 'Total Organizations', value: totalOrgs, icon: Building,
            accent: 'from-indigo-500 to-indigo-600',
            sub: `${activeOrgs} Active Workspaces`, subClass: 'text-green-600 font-semibold'
          },
          {
            label: 'Revenue (Paid Plans)', value: `Rs. ${monthlyRevenue.toLocaleString()}`, icon: DollarSign,
            accent: 'from-emerald-500 to-green-600',
            sub: 'Based on active, paid subscriptions'
          },
          {
            label: 'Pending NGOs', value: pendingOrgs, icon: Clock,
            accent: 'from-amber-500 to-orange-500',
            sub: 'Requires Approval', subClass: 'text-amber-600 font-semibold'
          },
          {
            label: 'Suspended', value: suspendedOrgs, icon: PauseCircle,
            accent: 'from-red-500 to-rose-600',
            sub: 'Organizations Suspended', subClass: 'text-red-600 font-semibold'
          },
          {
            label: 'Registered Users', value: totalUsers, icon: Users,
            accent: 'from-purple-500 to-fuchsia-600',
            sub: 'Across all organizations'
          }
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-gray-500">
                {card.label}
              </span>
              <div className={`bg-gradient-to-br ${card.accent} text-white rounded-xl p-2 shadow-md`}>
                <card.icon size={18} />
              </div>
            </div>

            <h2 className="text-4xl font-bold text-black mt-4">
              {card.value}
            </h2>

            <p className={`text-sm mt-2 ${card.subClass || 'text-gray-600'}`}>
              {card.sub}
            </p>
          </div>
        ))}

      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">

        {/* Growth Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

          <h2 className="text-2xl font-bold text-black">
            Monthly Subscription Growth
          </h2>

          <p className="text-gray-600 text-sm mb-6">
            Cumulative workspace acquisition over 2026
          </p>

          <div className="h-[220px]">
            <svg viewBox="0 0 500 200" className="w-full h-full">

              <line x1="40" y1="20" x2="480" y2="20" stroke="#E5E7EB" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="#E5E7EB" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="#E5E7EB" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="#E5E7EB" />

              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
                </linearGradient>
              </defs>

              <path
                d="M40 170 C100 150,160 140,220 110 C280 80,340 70,400 40 L400 170 Z"
                fill="url(#chartGradient)"
              />

              <path
                d="M40 170 C100 150,160 140,220 110 C280 80,340 70,400 40"
                fill="none"
                stroke="#6366F1"
                strokeWidth="3"
              />

              <circle cx="40" cy="170" r="5" fill="#6366F1"/>
              <circle cx="130" cy="145" r="5" fill="#6366F1"/>
              <circle cx="220" cy="110" r="5" fill="#6366F1"/>
              <circle cx="310" cy="75" r="5" fill="#6366F1"/>
              <circle cx="400" cy="40" r="5" fill="#9333EA"/>
              <text x="40" y="190" fill="#6B7280" fontSize="10" textAnchor="middle">Feb</text>
              <text x="130" y="190" fill="#6B7280" fontSize="10" textAnchor="middle">Mar</text>
              <text x="220" y="190" fill="#6B7280" fontSize="10" textAnchor="middle">Apr</text>
              <text x="310" y="190" fill="#6B7280" fontSize="10" textAnchor="middle">May</text>
              <text x="400" y="190" fill="#6B7280" fontSize="10" textAnchor="middle">Jun</text>

            </svg>
          </div>

        </div>

        {/* Recent Workspaces */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h2 className="text-2xl font-bold text-black">
                Recent Workspaces
              </h2>

              <p className="text-sm text-gray-600">
                Newly registered NGOs on the platform
              </p>
            </div>

            <button
              onClick={() => navigate("/super-admin/organizations")}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              View All
            </button>

          </div>

          <div className="space-y-4">

            {recentOrgs.map((org) => {

              const badgeClass =
                org.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700";

              return (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition"
                >
                  <div>

                    <h4 className="font-bold text-black">
                      {org.name}
                    </h4>

                    <p className="text-sm text-gray-600 mt-1">
                      Joined {org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} • {org.subPlan}
                    </p>

                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}
                  >
                    {org.status}
                  </span>

                </div>
              );

            })}

            {recentOrgs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                No organizations registered yet.
              </p>
            )}

          </div>

        </div>

      </div>

      {/* Platform Alerts (subscription expiry, system notices) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl p-2 shadow-md">
            <Bell size={18} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Platform Alerts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Subscription expiries and system-wide notices across all organizations
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {platformAlerts.length > 0 ? (
            platformAlerts.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition"
              >
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-black">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              No platform alerts right now.
            </p>
          )}
        </div>

      </div>

    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
