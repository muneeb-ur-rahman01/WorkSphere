import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import {
  CreditCard, ShieldCheck, AlertTriangle, Clock, History, CheckCircle2, XCircle, Hourglass
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, PAYMENTS_ENABLED } from '../../../Config/constant';
import CountdownTimer from '../../../shared/CountdownTimer/CountdownTimer';

const formatPKR = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const formatDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const subStatusBadge = (status) => {
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

const paymentStatusBadge = (status) => {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-700';
    case 'Failed': return 'bg-red-100 text-red-700';
    case 'Refunded': return 'bg-gray-200 text-gray-700';
    default: return 'bg-yellow-100 text-yellow-700'; // Pending
  }
};

const paymentStatusIcon = (status) => {
  if (status === 'Completed') return <CheckCircle2 size={14} className="text-green-600" />;
  if (status === 'Failed') return <XCircle size={14} className="text-red-600" />;
  return <Hourglass size={14} className="text-yellow-600" />;
};

const Billing = () => {
  const { currentUser, organizations, payWithGateway, getOrgBillingHistory } = useContext(AppContext);

  const myOrg = organizations.find(o => o.id === currentUser.orgId);
  const subscription = myOrg?.subscription || null;
  const planKey = myOrg?.subPlan && SUBSCRIPTION_PLANS[myOrg.subPlan] ? myOrg.subPlan : 'Basic';

  const [selectedPlan, setSelectedPlan] = useState(planKey);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    setSelectedPlan(planKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myOrg?.subPlan]);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.orgId) return;
      setLoading(true);
      const res = await getOrgBillingHistory(currentUser.orgId);
      if (res.success) {
        setEvents(res.events);
        setPayments(res.payments);
      } else {
        setHistoryError(res.error || 'Could not load billing history.');
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.orgId]);

  const daysUntilExpiry = myOrg?.subscriptionEnd
    ? Math.ceil((new Date(myOrg.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const countdownTarget = !subscription?.isOverdue ? (myOrg?.subscriptionEnd || myOrg?.paymentDueAt) : null;
  const countdownLabel = myOrg?.subscriptionEnd ? 'Plan renews in' : 'Payment due in';
  const countdownAmountLabel = !myOrg?.subscriptionEnd && myOrg?.amountDue
    ? `Rs. ${Number(myOrg.amountDue).toLocaleString('en-PK')} due — ${SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan || 'Basic Plan'}`
    : undefined;

  const handlePay = async () => {
    setPayError('');
    setPayLoading(true);
    const res = await payWithGateway(currentUser.orgId, selectedPlan);
    if (!res.success) {
      setPayError(res.error || 'Could not start the payment gateway checkout.');
      setPayLoading(false);
    }
  };

  // Payment Method is temporarily disabled app-wide (see PAYMENTS_ENABLED in
  // Config/constant.js) — this page is only reachable via the nav item,
  // which is itself hidden while disabled; guard the direct URL too.
  if (!PAYMENTS_ENABLED) {
    return <Navigate to="/org-admin/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 p-8 shadow-xl">
          <div className="absolute -right-10 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <h1 className="text-3xl font-bold text-white">Billing & Subscription</h1>
            <p className="text-indigo-100 mt-2 max-w-xl">
              Your plan, payment status, and complete billing history — all in one place.
            </p>
          </div>
        </div>

        {/* Overdue / reminder strip */}
        {subscription?.isOverdue && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
            <div className="bg-red-100 text-red-600 rounded-xl p-2.5 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="font-bold text-red-800">Payment Overdue</p>
              <p className="text-sm text-red-700 mt-1 leading-6">
                Your subscription payment of <strong>{formatPKR(subscription.amountDue)}</strong> for
                the <strong>{SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan}</strong> is overdue
                by <strong>{subscription.overdueDays} day{subscription.overdueDays === 1 ? '' : 's'}</strong>.
                {subscription.operationsBlocked && ' Your organization\'s operations are currently paused until payment is completed.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Current Plan + Pay Now */}
          <div className="xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-2 shadow-md">
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">Your Plan</h2>
                <p className="text-sm text-gray-600 mt-0.5">Current subscription details</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 mb-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">Selected Plan</p>
                  <p className="text-lg font-bold text-black">{SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan || 'Basic Plan'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${subStatusBadge(subscription?.subscriptionStatus)}`}>
                  {subscription?.subscriptionStatus || 'TrialPending'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Plan price</span>
                <span className="font-semibold text-black">{formatPKR(SUBSCRIPTION_PLANS[planKey]?.price ?? myOrg?.planPrice)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Payment status</span>
                <span className={`font-semibold ${myOrg?.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                  {myOrg?.paymentStatus || 'Unpaid'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Registered on</span>
                <span className="font-semibold text-black">{formatDate(myOrg?.registrationDate)}</span>
              </div>

              <div className="pt-3 border-t border-gray-200">
                {subscription?.isOverdue ? (
                  <p className="text-sm flex items-center gap-1.5 text-red-600 font-semibold">
                    <AlertTriangle size={14} />
                    {subscription.overdueDays} day{subscription.overdueDays === 1 ? '' : 's'} overdue — {formatPKR(subscription.amountDue)} due
                  </p>
                ) : myOrg?.subscriptionEnd ? (
                  <p className={`text-sm flex items-center gap-1.5 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>
                    <Clock size={14} />
                    {daysUntilExpiry !== null && daysUntilExpiry >= 0
                      ? `Renews on ${formatDate(myOrg.subscriptionEnd)} — ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} left`
                      : `Expired on ${formatDate(myOrg.subscriptionEnd)}`}
                  </p>
                ) : myOrg?.paymentDueAt ? (
                  <p className="text-sm flex items-center gap-1.5 text-gray-600">
                    <Clock size={14} />
                    Payment due by <strong className="text-black">{formatDate(myOrg.paymentDueAt)}</strong>
                    {(() => {
                      const days = Math.ceil((new Date(myOrg.paymentDueAt) - new Date()) / (1000 * 60 * 60 * 24));
                      return days >= 0 ? ` (${days} day${days === 1 ? '' : 's'} left)` : '';
                    })()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No active billing cycle yet — pay to activate.</p>
                )}
              </div>
            </div>

            {PAYMENTS_ENABLED && countdownTarget && (
              <div className="mb-5">
                <CountdownTimer
                  targetDate={countdownTarget}
                  label={countdownLabel}
                  amountLabel={countdownAmountLabel}
                />
              </div>
            )}

            {PAYMENTS_ENABLED && (
            <>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Choose / Renew Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-4 py-3 bg-white text-black border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.values(SUBSCRIPTION_PLANS).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} — {p.priceLabel}
                </option>
              ))}
            </select>

            {payError && <p className="text-red-600 text-xs mb-3">{payError}</p>}

            <button
              onClick={handlePay}
              disabled={payLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              {payLoading ? 'Redirecting to secure checkout…' : `Pay Now — ${SUBSCRIPTION_PLANS[selectedPlan]?.priceLabel}`}
            </button>
            </>
            )}

            <p className="text-xs text-gray-400 mt-3 text-center">
              Your card details are entered on our payment gateway's secure page and are never stored on our servers.
            </p>
          </div>

          {/* Payment History + Audit Trail */}
          <div className="xl:col-span-2 space-y-8">

            {/* Payment History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-2 shadow-md">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Payment History</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Every payment attempt for your organization</p>
                </div>
              </div>

              {historyError && <p className="text-red-600 text-sm mb-3">{historyError}</p>}

              {loading ? (
                <p className="text-gray-400 text-sm py-6 text-center">Loading payment history…</p>
              ) : payments.length === 0 ? (
                <p className="text-gray-400 text-sm py-6 text-center">No payments made yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-600">Plan</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-600">Gateway</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-600">Txn Ref No.</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-600">Date & Time</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-800">{p.plan}</td>
                          <td className="px-4 py-3 font-semibold text-black">{formatPKR(p.amount)}</td>
                          <td className="px-4 py-3 text-gray-600">{p.gateway}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.txnRefNo}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDateTime(p.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${paymentStatusBadge(p.status)}`}>
                              {paymentStatusIcon(p.status)}
                              {p.status}
                            </span>
                            {p.status === 'Failed' && p.responseMessage && (
                              <p className="text-[11px] text-red-500 mt-1 max-w-[180px]">{p.responseMessage}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl p-2 shadow-md">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Billing Activity</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Full timeline of registration, plan, and payment events</p>
                </div>
              </div>

              {loading ? (
                <p className="text-gray-400 text-sm py-6 text-center">Loading activity…</p>
              ) : events.length === 0 ? (
                <p className="text-gray-400 text-sm py-6 text-center">No billing activity recorded yet.</p>
              ) : (
                <div className="space-y-4 border-l-2 border-gray-100 pl-5 max-h-96 overflow-y-auto pr-1">
                  {events.map((e) => (
                    <div key={e.id} className="relative">
                      <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <p className="text-sm font-semibold text-black capitalize">{e.eventType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {e.amount ? `${formatPKR(e.amount)} · ` : ''}
                        {e.previousStatus && e.newStatus ? `${e.previousStatus} → ${e.newStatus} · ` : ''}
                        {formatDateTime(e.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
