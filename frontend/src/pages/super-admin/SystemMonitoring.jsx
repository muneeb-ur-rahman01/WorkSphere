import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Activity, Building, Users, CheckCircle2, Clock, Ban, Loader2, History } from 'lucide-react';

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const TONE_CLASSES = {
  indigo: 'bg-indigo-100 text-indigo-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600'
};

const HealthCard = ({ icon: Icon, label, value, tone = 'indigo' }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${TONE_CLASSES[tone]}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-2xl font-bold text-black">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const SystemMonitoring = () => {
  const { organizations, users, fetchAuditLogs } = useContext(AppContext);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogs({ limit: 15 }).then((res) => {
      if (cancelled) return;
      if (res.success) setRecentActivity(res.logs);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchAuditLogs]);

  const platformUsers = users.filter((u) => u.role !== 'SuperAdmin');

  const orgCounts = {
    total: organizations.length,
    active: organizations.filter((o) => o.status === 'Active').length,
    pending: organizations.filter((o) => o.status === 'Pending').length,
    suspended: organizations.filter((o) => o.status === 'Suspended').length
  };

  const userCounts = {
    total: platformUsers.length,
    active: platformUsers.filter((u) => u.status === 'Active').length,
    pending: platformUsers.filter((u) => u.status === 'Pending').length
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <Activity size={26} className="text-indigo-600" /> System Monitoring
        </h1>
        <p className="text-gray-600 mt-1">A live snapshot of platform health and recent activity.</p>
      </div>

      <div className="mb-4 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-semibold text-black">All systems operational</span>
        <span className="text-xs text-gray-400">API and database responding normally</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <HealthCard icon={Building} label="Total Organizations" value={orgCounts.total} tone="indigo" />
        <HealthCard icon={CheckCircle2} label="Active Organizations" value={orgCounts.active} tone="green" />
        <HealthCard icon={Clock} label="Pending Approval" value={orgCounts.pending} tone="amber" />
        <HealthCard icon={Ban} label="Suspended Organizations" value={orgCounts.suspended} tone="red" />
        <HealthCard icon={Users} label="Total Platform Users" value={userCounts.total} tone="indigo" />
        <HealthCard icon={CheckCircle2} label="Active Users" value={userCounts.active} tone="green" />
        <HealthCard icon={Clock} label="Pending User Approvals" value={userCounts.pending} tone="amber" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 text-black font-bold">
          <History size={18} className="text-indigo-600" /> Recent Platform Activity
        </div>
        <div className="divide-y divide-gray-50">
          {loading && (
            <div className="px-6 py-10 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading recent activity...
            </div>
          )}
          {!loading && recentActivity.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400">No recent activity recorded.</div>
          )}
          {!loading && recentActivity.map((log) => (
            <div key={log.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm">
              <div>
                <span className="font-semibold text-black">{log.actorName || 'System'}</span>{' '}
                <span className="text-gray-600">{log.action.replace(/[._]/g, ' ')}</span>{' '}
                {log.entityLabel && <span className="text-gray-500">— {log.entityLabel}</span>}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
          For the full, filterable trail see the Audit Logs section.
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SystemMonitoring;
