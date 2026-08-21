import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Search, Building, X, Clock, CreditCard, History } from 'lucide-react';

const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'PastDue', 'Suspended', 'Premium', 'Standard', 'Basic'];

const formatPKR = (amount) => (amount === null || amount === undefined ? '—' : `Rs. ${Number(amount).toLocaleString('en-PK')}`);
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const formatDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'TrialPending': return 'bg-yellow-100 text-yellow-700';
    case 'PastDue': return 'bg-orange-100 text-orange-700';
    case 'Suspended': return 'bg-red-100 text-red-700';
    case 'Cancelled':
    case 'Expired': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const BillingDashboard = () => {
  const { getBillingOverview, getOrgBillingHistory } = useContext(AppContext);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [historyOrg, setHistoryOrg] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await getBillingOverview({ status, search, from: from || undefined, to: to || undefined });
    if (res.success) setRows(res.organizations);
    else setError(res.error);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search/filter changes
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, from, to]);

  const openHistory = async (row) => {
    setHistoryOrg(row);
    setHistoryLoading(true);
    const res = await getOrgBillingHistory(row.orgId);
    if (res.success) {
      setHistoryEvents(res.events);
      setHistoryPayments(res.payments);
    }
    setHistoryLoading(false);
  };

  return (
    <DashboardLayout>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Billing & Payments</h1>
          <p className="text-gray-600 mt-1">
            Every organization's subscription, payment status, and billing history in one place.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Search by organization name, ID, or transaction reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white text-black placeholder-gray-400 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase text-gray-500">Registered between</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-white text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-gray-400 text-sm">and</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-white text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-indigo-600 font-semibold hover:underline">
              Clear dates
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Organization Billing Records</h2>
          <p className="text-gray-600 text-sm mt-1">{rows.length} organization{rows.length === 1 ? '' : 's'} matching current filters</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Organization</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Plan</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Registered</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Payment Due</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Last Payment</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Txn Ref / Gateway</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Overdue</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">History</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">Loading billing records…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">No organizations match these filters.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.orgId} className="border-t border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><Building size={16} /></div>
                        <div>
                          <p className="font-semibold text-black">{row.orgName}</p>
                          <p className="text-xs text-gray-500">ID: {row.orgId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{row.planLabel}</span>
                      <p className="text-xs text-gray-500 mt-1">{formatPKR(row.planPrice)}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{formatDate(row.registrationDate)}</td>
                    <td className="px-6 py-4 text-gray-700">{formatDate(row.paymentDueAt)}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {row.paymentDate ? (
                        <>
                          <p>{formatPKR(row.paymentAmount)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(row.paymentDate)}</p>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {row.txnRefNo ? (
                        <>
                          <p className="font-mono text-xs">{row.txnRefNo}</p>
                          <p className="text-xs text-gray-500">{row.gateway}</p>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {row.overdueDays > 0 ? (
                        <span className="text-red-600 font-bold">{row.overdueDays}d</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(row.subscriptionStatus)}`}>
                        {row.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openHistory(row)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition"
                      >
                        <History size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Drawer */}
      {historyOrg && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={() => setHistoryOrg(null)}>
          <div
            className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-black">{historyOrg.orgName}</h3>
                <p className="text-xs text-gray-500">Billing history & audit trail</p>
              </div>
              <button onClick={() => setHistoryOrg(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            {historyLoading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : (
              <>
                <div className="mb-8">
                  <h4 className="flex items-center gap-2 font-bold text-black mb-3 text-sm uppercase tracking-wide">
                    <CreditCard size={16} /> Payments
                  </h4>
                  {historyPayments.length === 0 ? (
                    <p className="text-gray-400 text-sm">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyPayments.map((p) => (
                        <div key={p.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-black">{formatPKR(p.amount)} — {p.plan}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              p.status === 'Failed' ? 'bg-red-100 text-red-700' :
                              p.status === 'Refunded' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{p.status}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-mono">{p.txnRefNo} · {p.gateway}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(p.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="flex items-center gap-2 font-bold text-black mb-3 text-sm uppercase tracking-wide">
                    <Clock size={16} /> Audit Trail
                  </h4>
                  {historyEvents.length === 0 ? (
                    <p className="text-gray-400 text-sm">No billing events recorded yet.</p>
                  ) : (
                    <div className="space-y-3 border-l-2 border-gray-100 pl-4">
                      {historyEvents.map((e) => (
                        <div key={e.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                          <p className="text-sm font-semibold text-black">{e.eventType.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">
                            {e.amount ? `${formatPKR(e.amount)} · ` : ''}
                            {e.previousStatus && e.newStatus ? `${e.previousStatus} → ${e.newStatus} · ` : ''}
                            {formatDateTime(e.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default BillingDashboard;
