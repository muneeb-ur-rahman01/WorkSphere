import React from 'react';
import { ShieldAlert } from 'lucide-react';

const formatPKR = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

// Rendered instead of the normal operational dashboard content for
// OrgAdmin/staff whenever req.subscription.operationsBlocked is true
// server-side (enforced independently by requireOperational() on every
// write route — this component is just the corresponding UI state, not
// the actual enforcement). Org data itself is never hidden or deleted;
// only the ability to create/change things is paused until payment.
const SuspendedNotice = ({ subscription, planLabel, payHref = '#billing' }) => {
  if (!subscription) return null;

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-10">
      <div className="bg-white border border-red-200 rounded-2xl shadow-xl p-10 text-center">
        <div className="inline-flex p-4 rounded-full bg-red-100 text-red-600 mb-6">
          <ShieldAlert size={44} />
        </div>
        <h2 className="text-2xl font-bold text-black mb-3">Payment Required</h2>
        <p className="text-gray-700 text-sm leading-7 mb-6">
          Your organization's operations are paused because the subscription payment
          for the <strong>{planLabel}</strong> ({formatPKR(subscription.amountDue)}) is
          overdue by {subscription.overdueDays} day{subscription.overdueDays === 1 ? '' : 's'}.
          Your data is safe and nothing has been deleted — complete payment below to
          restore access immediately.
        </p>
        <a
          href={payHref}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
        >
          Go to Billing & Pay Now
        </a>
      </div>
    </div>
  );
};

export default SuspendedNotice;
