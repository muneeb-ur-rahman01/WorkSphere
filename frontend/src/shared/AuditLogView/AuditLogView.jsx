import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { RefreshCw, History } from 'lucide-react';

const ACTION_LABELS = {
  'organization.status_changed': 'Organization status changed',
  'organization.approved': 'Organization approved',
  'organization.rejected': 'Organization rejected',
  'organization.suspended': 'Organization suspended',
  'organization.deleted': 'Organization deleted',
  'user.status_changed': 'User status changed',
  'user.approved': 'User approved',
  'user.rejected': 'User rejected',
  'user.suspended': 'User suspended',
  'user.role_changed': 'User role changed',
  'user.deleted': 'User removed',
  'permission.granted': 'Access granted',
  'permission.revoked': 'Access revoked',
  'platform_setting.updated': 'Platform setting updated'
};

const ENTITY_TYPES = ['organization', 'user', 'permission', 'platform_setting'];

const actionLabel = (action) => ACTION_LABELS[action] || action;

const actionBadgeClass = (action) => {
  if (/deleted|rejected|suspended|revoked/.test(action)) return 'bg-red-50 text-red-700 border-red-200';
  if (/approved|granted/.test(action)) return 'bg-green-50 text-green-700 border-green-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const formatChange = (log) => {
  if (!log.previousValue && !log.newValue) return '—';
  const prev = log.previousValue ? Object.values(log.previousValue)[0] : null;
  const next = log.newValue ? Object.values(log.newValue)[0] : null;
  if (prev && next) return `${prev} → ${next}`;
  return next || prev || '—';
};

// scope: 'platform' (Super Admin, sees every org, can filter by org) |
// 'org' (Org Admin, always scoped server-side to their own org — see
// backend/controllers/auditLogController.js).
const AuditLogView = ({ scope = 'org' }) => {
  const { fetchAuditLogs, organizations } = useContext(AppContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = { limit: 100 };
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entityType = entityFilter;
    if (scope === 'platform' && orgFilter) params.orgId = orgFilter;
    const res = await fetchAuditLogs(params);
    setLoading(false);
    if (res.success) setLogs(res.logs);
    else setError(res.error);
  }, [fetchAuditLogs, actionFilter, entityFilter, orgFilter, scope]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex items-center gap-2 text-black font-bold">
          <History size={18} className="text-indigo-600" />
          Audit Trail
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
          >
            <option value="">All actions</option>
            {Object.keys(ACTION_LABELS).map((key) => (
              <option key={key} value={key}>{actionLabel(key)}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
          >
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          {scope === 'platform' && (
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
            >
              <option value="">All organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <p className="px-6 py-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th className="px-6 py-3 font-semibold">When</th>
              <th className="px-6 py-3 font-semibold">Actor</th>
              <th className="px-6 py-3 font-semibold">Action</th>
              <th className="px-6 py-3 font-semibold">Entity</th>
              <th className="px-6 py-3 font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  {loading ? 'Loading audit logs...' : 'No audit activity recorded yet.'}
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                <td className="px-6 py-3 text-gray-800">
                  {log.actorName || 'System'}
                  {log.actorRole && <span className="text-gray-400 text-xs"> ({log.actorRole})</span>}
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${actionBadgeClass(log.action)}`}>
                    {actionLabel(log.action)}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-700">{log.entityLabel || log.entityType}</td>
                <td className="px-6 py-3 text-gray-600">{formatChange(log)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogView;
