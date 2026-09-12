import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Building,
  Search,
  Filter,
  AlertCircle,
  X,
} from 'lucide-react';

const STATUS_FILTERS = ['Pending', 'Approved', 'Rejected', 'All'];

const statusMeta = {
  Pending: {
    icon: Clock,
    badge: 'text-amber-700 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  Approved: {
    icon: CheckCircle2,
    badge: 'text-green-700 bg-green-50 border-green-200',
    iconBg: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  Rejected: {
    icon: XCircle,
    badge: 'text-red-700 bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
};

const SuperAdminVisibilityRequests = () => {
  const { visibilityRequests, reviewVisibilityRequest } =
    useContext(AppContext);

  const [statusFilter, setStatusFilter] = useState('Pending');
  const [search, setSearch] = useState('');
  const [rejectingItem, setRejectingItem] = useState(null);
  const [reason, setReason] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  const filtered = useMemo(() => {
    return visibilityRequests
      .filter(
        (r) =>
          statusFilter === 'All' ||
          r.visibilityStatus === statusFilter
      )
      .filter((r) => {
        const query = search.toLowerCase().trim();

        if (!query) return true;

        return [
          r.title,
          r.orgName,
          r.location,
          r.itemType,
          r.description,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );
      })
      .sort(
        (a, b) =>
          new Date(b.visibilityRequestedAt || 0) -
          new Date(a.visibilityRequestedAt || 0)
      );
  }, [visibilityRequests, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      Pending: visibilityRequests.filter(
        (r) => r.visibilityStatus === 'Pending'
      ).length,
      Approved: visibilityRequests.filter(
        (r) => r.visibilityStatus === 'Approved'
      ).length,
      Rejected: visibilityRequests.filter(
        (r) => r.visibilityStatus === 'Rejected'
      ).length,
      All: visibilityRequests.length,
    };
  }, [visibilityRequests]);

  const handleApprove = async (item) => {
    const key = `${item.itemType}-${item.id}`;

    try {
      setBusyKey(key);
      await reviewVisibilityRequest(
        item.itemType,
        item.id,
        'Approved'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const openReject = (item) => {
    setRejectingItem(item);
    setReason('');
  };

  const closeReject = () => {
    if (busyKey) return;

    setRejectingItem(null);
    setReason('');
  };

  const confirmReject = async () => {
    if (!rejectingItem) return;

    const key = `${rejectingItem.itemType}-${rejectingItem.id}`;

    try {
      setBusyKey(key);

      await reviewVisibilityRequest(
        rejectingItem.itemType,
        rejectingItem.id,
        'Rejected',
        reason
      );

      setRejectingItem(null);
      setReason('');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                <Globe size={14} />
                PUBLIC VISIBILITY MANAGEMENT
              </div>

              <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Event & Camp Visibility Requests
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review organization requests and decide which camps and
                events should be featured on the public Home Page.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATUS_FILTERS.map((status) => {
            const meta = statusMeta[status];

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  statusFilter === status
                    ? 'border-indigo-200 ring-2 ring-indigo-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      status === 'All'
                        ? 'bg-indigo-50 text-indigo-600'
                        : meta.iconBg
                    }`}
                  >
                    {status === 'All' ? (
                      <Filter size={18} />
                    ) : (
                      <meta.icon size={18} />
                    )}
                  </div>

                  <span className="text-2xl font-black text-slate-900">
                    {counts[status]}
                  </span>
                </div>

                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {status} Requests
                </p>
              </button>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                  statusFilter === status
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts[status]}
              </span>
            </button>
          ))}
        </div>

        {/* Requests Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Table Header */}
          <div className="hidden border-b border-slate-100 bg-slate-50 px-6 py-3 lg:block">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <span>Status</span>
              <span>Request Details</span>
              <span>Action</span>
            </div>
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <AlertCircle size={28} />
              </div>

              <h3 className="text-base font-bold text-slate-800">
                No requests found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {search
                  ? 'Try changing your search keyword or selected filter.'
                  : 'There are no visibility requests matching this filter.'}
              </p>
            </div>
          )}

          {/* Request List */}
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const meta =
                statusMeta[item.visibilityStatus] ||
                statusMeta.Pending;

              const Icon = meta.icon;
              const key = `${item.itemType}-${item.id}`;
              const isBusy = busyKey === key;

              return (
                <div
                  key={key}
                  className="group px-4 py-5 transition hover:bg-slate-50/70 sm:px-6"
                >
                  <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-5">

                    {/* Status Icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.badge}`}
                    >
                      <Icon size={20} />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-extrabold text-slate-900">
                          {item.title}
                        </h2>

                        <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-600">
                          {item.itemType}
                        </span>

                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                          />
                          {item.visibilityStatus}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Building
                            size={13}
                            className="text-slate-400"
                          />
                          {item.orgName || '—'}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Calendar
                            size={13}
                            className="text-slate-400"
                          />
                          {item.date}
                          {item.time ? ` · ${item.time}` : ''}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <MapPin
                            size={13}
                            className="text-slate-400"
                          />
                          {item.location || '—'}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-5 text-slate-500">
                          {item.description}
                        </p>
                      )}

                      {item.visibilityStatus === 'Rejected' &&
                        item.visibilityRejectionReason && (
                          <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <span className="font-bold">
                              Rejection reason:
                            </span>{' '}
                            {item.visibilityRejectionReason}
                          </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2 lg:justify-end">
                      {item.visibilityStatus === 'Pending' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(item)}
                            disabled={isBusy}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />

                            {isBusy ? 'Processing...' : 'Approve'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openReject(item)}
                            disabled={isBusy}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${meta.badge}`}
                        >
                          <Icon size={13} />
                          {item.visibilityStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeReject();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <XCircle size={20} />
                </div>

                <h3 className="text-lg font-black text-slate-900">
                  Reject Visibility Request
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review the request before confirming rejection.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReject}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Request
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {rejectingItem.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {rejectingItem.orgName || 'Organization'} ·{' '}
                  {rejectingItem.itemType}
                </p>
              </div>

              <div>
                <label
                  htmlFor="rejectionReason"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Reason{' '}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="rejectionReason"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Missing a clear description or banner image"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  This reason may be shown to the organization.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReject}
                disabled={Boolean(busyKey)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmReject}
                disabled={
                  busyKey ===
                  `${rejectingItem.itemType}-${rejectingItem.id}`
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={16} />

                {busyKey ===
                `${rejectingItem.itemType}-${rejectingItem.id}`
                  ? 'Rejecting...'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SuperAdminVisibilityRequests;
