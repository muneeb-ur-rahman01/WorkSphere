import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';

const ForgotPassword = () => {
  const { forgotPassword } = useContext(AppContext);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    const res = await forgotPassword(email);
    setSubmitting(false);

    if (res.success) {
      // Always show the generic confirmation - the backend never reveals
      // whether the email is actually registered.
      setSubmitted(true);
    } else {
      setError(res.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto mt-20 mb-24 px-5">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 animate-slide-up">

          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-5">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-black">
                Check your inbox
              </h2>

              <p className="text-gray-600 mt-3 leading-7">
                If an account exists for <span className="font-semibold text-black">{email}</span>,
                we've sent a link to reset your password. The link expires in 1 hour.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                Didn't get an email? Check your spam folder, or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
                >
                  try again
                </button>.
              </p>

              <Link
                to="/login-choice"
                className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-black text-center">
                Forgot Password?
              </h2>

              <p className="text-center text-gray-600 mt-2 mb-8">
                Enter the email address associated with your account and we'll
                send you a link to reset your password.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-black mb-2">
                    Email Address
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@ghf.org"
                    className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Mail size={18} />
                  {submitting ? 'Sending link...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                <Link
                  to="/login-choice"
                  className="inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-700 transition"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </PublicLayout>
  );
};

export default ForgotPassword;
