import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import PublicLayout from '../../layouts/PublicLayout';
import Card from '../../shared/Card/Card';
import Button from '../../shared/Button/Button';

// The active payment gateway redirects the customer's browser here after
// checkout (see backend/controllers/paymentController.js -> handleCallback).
const PaymentResult = () => {
  const [params] = useSearchParams();
  const status = params.get('status');
  const plan = params.get('plan');
  const reason = params.get('reason');
  const isSuccess = status === 'success';

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto mt-16 mb-24 px-5">
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-xl p-10 text-center">
          <div
            className={`inline-flex p-4 rounded-full mb-6 ${
              isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {isSuccess ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            {isSuccess ? 'Payment Successful' : 'Payment Failed'}
          </h2>

          <p className="text-gray-700 text-sm leading-7 mb-8">
            {isSuccess
              ? `Your payment for the ${plan || 'subscription'} was received and your subscription has been updated.`
              : `We couldn't complete your payment${reason ? ` (${reason})` : ''}. No amount was charged — please try again.`}
          </p>

          <div className="flex flex-col gap-3">
            <Link to="/login-choice">
              <Button variant="primary" fullWidth>
                Go to Login
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" fullWidth>
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default PaymentResult;
