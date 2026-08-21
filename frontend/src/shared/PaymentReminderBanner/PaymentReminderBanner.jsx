import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const formatPKR = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

// Shown on the OrgAdmin dashboard whenever subscription.shouldShowPaymentReminder
// is true — i.e. more than 5 days have passed since registration and the
// 10-day trial payment window still hasn't been paid (computed server-side
// in backend/middleware/subscriptionAccess.js). Dismissal is session-only
// (component state, not persisted) so it reappears on the next login while
// payment remains outstanding. This is a secondary, inline reminder — the
// same condition also triggers a popup modal mounted globally in
// DashboardLayout.jsx (PaymentAlertModal), so the admin sees it everywhere,
// not just this page.
const PaymentReminderBanner = ({ subscription, planLabel, payHref = '#billing' }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!subscription || !subscription.shouldShowPaymentReminder || dismissed) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm flex items-start gap-4">
      <div className="bg-red-100 text-red-600 rounded-xl p-2.5 shrink-0">
        <AlertTriangle size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-red-800">Payment Reminder</p>
        <p className="text-sm text-red-700 mt-1 leading-6">
          Your organization has <strong>{subscription.daysUntilDue} day{subscription.daysUntilDue === 1 ? '' : 's'} left</strong> to
          complete the subscription payment of <strong>{formatPKR(subscription.amountDue)}</strong> for
          the <strong>{planLabel}</strong>. If payment isn't received by the due date, operations will be
          paused automatically until payment is made.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <a
            href={payHref}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
          >
            Pay Now
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="text-sm text-red-600 hover:text-red-800 font-semibold"
          >
            Dismiss for now
          </button>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-red-400 hover:text-red-600 shrink-0"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default PaymentReminderBanner;
