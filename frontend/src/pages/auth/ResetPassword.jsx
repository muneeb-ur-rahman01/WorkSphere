import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';

// Simple client-side password strength check to give the user quick feedback
// before hitting the server (the server enforces the real minimum length).
const getPasswordHint = (password) => {
  if (!password) return null;
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

const ResetPassword = () => {
  const { token } = useParams();
  const { validateResetToken, resetPassword } = useContext(AppContext);
  const navigate = useNavigate();

  // 'checking' | 'valid' | 'invalid'
  const [tokenStatus, setTokenStatus] = useState('checking');
  const [tokenError, setTokenError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        setTokenError('This reset link is invalid or has already been used.');
        return;
      }
      const res = await validateResetToken(token);
      if (cancelled) return;

      if (res.success) {
        setTokenStatus('valid');
      } else {
        setTokenStatus('invalid');
        setTokenError(res.error || 'This reset link is invalid or has expired.');
      }
    };

    checkToken();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const res = await resetPassword(token, newPassword);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      // A token can expire/be consumed between the initial validity check and
      // submission (e.g. used in another tab) - handle that gracefully too.
      setError(res.error || 'Could not reset password. Please try again.');
      if (/invalid|expired/i.test(res.error || '')) {
        setTokenStatus('invalid');
        setTokenError(res.error);
      }
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto mt-20 mb-24 px-5">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 animate-slide-up">

          {tokenStatus === 'checking' && (
            <div className="text-center py-10">
              <Loader2 className="mx-auto animate-spin text-indigo-600" size={32} />
              <p className="text-gray-600 mt-4">Verifying your reset link...</p>
            </div>
          )}

          {tokenStatus === 'invalid' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-5">
                <XCircle className="text-red-600" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-black">
                Link Invalid or Expired
              </h2>

              <p className="text-gray-600 mt-3 leading-7">
                {tokenError}
              </p>

              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center gap-2 mt-8 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 transition-all duration-300"
              >
                Request a New Link
              </Link>
            </div>
          )}

          {tokenStatus === 'valid' && !success && (
            <>
              <h2 className="text-3xl font-bold text-black text-center">
                Reset Your Password
              </h2>

              <p className="text-center text-gray-600 mt-2 mb-8">
                Choose a new password for your account.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-black mb-2">
                    New Password
                  </label>

                  <input
                    type="password"
                    name="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {getPasswordHint(newPassword) && (
                    <p className="text-xs text-gray-500 mt-1.5">{getPasswordHint(newPassword)}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-black mb-2">
                    Confirm New Password
                  </label>

                  <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <KeyRound size={18} />
                  {submitting ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {success && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-5">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-black">
                Password Reset Successfully
              </h2>

              <p className="text-gray-600 mt-3 leading-7">
                Your password has been updated. You can now log in with your new password.
              </p>

              <button
                onClick={() => navigate('/login-choice')}
                className="mt-8 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 hover:shadow-xl transition-all duration-300"
              >
                Go to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
};

export default ResetPassword;
