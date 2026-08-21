import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

const formatPKR = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

// Shown for the OrgAdmin as an actual popup (overlay), not just an inline
// banner, per two rules driven by backend/middleware/subscriptionAccess.js
// -> computeSubscriptionView():
//
//   1. Day 6-10 of the 10-day trial payment window, still unpaid:
//      subscription.shouldShowPaymentReminder is true. Dismissible for the
//      current session — reappears on next login/page load while still
//      unpaid, since dismissal state is component-local, not persisted.
//
//   2. Day 10+ passed, still unpaid (subscription.operationsBlocked true,
//      set by the hourly backend sweep in subscriptionScheduler.js):
//      a blocking popup explains operations are paused until payment.
//      It can be closed to read the page underneath, but reappears on the
//      next page load — it isn't meant to be permanently dismissible,
//      since the underlying block isn't lifted until payment succeeds.
//
// Mounted once in DashboardLayout.jsx so it's visible across every OrgAdmin
// page, not just the dashboard.
const PaymentAlertModal = ({ subscription, planLabel }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Reset the "dismissed for this session" flag whenever the underlying
  // reason for showing it changes (e.g. reminder -> blocked), so the more
  // urgent blocked popup isn't accidentally suppressed by an earlier
  // reminder dismissal.
  const alertKey = subscription?.operationsBlocked ? 'blocked' : subscription?.shouldShowPaymentReminder ? 'reminder' : null;
  useEffect(() => {
    setDismissed(false);
  }, [alertKey]);

  if (!subscription || !alertKey || dismissed) return null;

  const goToBilling = () => {
    setDismissed(true);
    navigate('/org-admin/billing');
  };

  const isBlocked = alertKey === 'blocked';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7 relative animate-scale-up">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className={`inline-flex p-3.5 rounded-full mb-5 ${isBlocked ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          {isBlocked ? <ShieldAlert size={30} /> : <AlertTriangle size={30} />}
        </div>

        <h3 className="text-xl font-bold text-black mb-2">
          {isBlocked ? 'Operations Paused — Payment Required' : 'Payment Reminder'}
        </h3>

        {isBlocked ? (
          <p className="text-sm text-gray-700 leading-6 mb-6">
            Your organization's 10-day payment window has ended and the subscription payment
            of <strong>{formatPKR(subscription.amountDue)}</strong> for the <strong>{planLabel}</strong> was
            not received. All operations (camps, events, tasks, and other actions) are paused
            until payment is completed. Your data is safe — nothing has been deleted. Complete
            payment now to unlock operations immediately.
          </p>
        ) : (
          <p className="text-sm text-gray-700 leading-6 mb-6">
            Your organization has {subscription.daysUntilDue} day{subscription.daysUntilDue === 1 ? '' : 's'} left
            to complete the subscription payment of <strong>{formatPKR(subscription.amountDue)}</strong> for
            the <strong>{planLabel}</strong>. If payment isn't received by the due date, your organization's
            operations will be paused automatically until payment is made.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={goToBilling}
            className={`flex-1 font-bold py-3 rounded-xl text-white shadow-md hover:shadow-lg transition ${
              isBlocked ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
            }`}
          >
            {isBlocked ? 'Pay Now to Unlock' : 'Pay Now'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
          >
            {isBlocked ? 'Close' : 'Remind me later'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentAlertModal;
