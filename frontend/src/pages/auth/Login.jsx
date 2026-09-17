import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';

const Login = () => {
  const { type } = useParams(); // 'superadmin' or 'org'
  const { login } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roleDomain: type === 'superadmin' ? 'SuperAdmin' : 'OrgAdmin'
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password show/hide state
  const [showPassword, setShowPassword] = useState(false);

  // Toast state
  const [toast, setToast] = useState({
    show: false,
    type: '',
    message: ''
  });

  const isSuperAdminMode = type === 'superadmin';

  // Auto hide toast after 5 seconds
  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      setToast({
        show: false,
        type: '',
        message: ''
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = (type, message) => {
    setToast({
      show: true,
      type,
      message
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleDomainChange = (domain) => {
    setFormData({
      ...formData,
      roleDomain: domain
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');

      showToast('error', 'Invalid Credentials');
      return;
    }

    const expectedDomain = isSuperAdminMode
      ? 'SuperAdmin'
      : formData.roleDomain;

    setSubmitting(true);

    try {
      const res = await login(
        formData.email,
        formData.password,
        expectedDomain
      );

      setSubmitting(false);

      if (res.success) {
        showToast('success', 'Login Successful');

        setTimeout(() => {
          if (res.user.role === 'SuperAdmin') {
            navigate('/super-admin/dashboard');
          } else if (res.user.role === 'OrgAdmin') {
            navigate('/org-admin/dashboard');
          } else {
            navigate('/staff/dashboard');
          }
        }, 500);
      } else {
        setError(res.error || 'Login failed.');
        showToast('error', 'Invalid Credentials');
      }
    } catch (err) {
      setSubmitting(false);

      setError('Invalid Credentials');
      showToast('error', 'Invalid Credentials');
    }
  };

  return (
    <PublicLayout>

      {/* =========================
          TOP RIGHT TOAST
      ========================== */}
      {toast.show && (
        <div
          className={`fixed top-6 right-6 z-[9999] min-w-[300px] max-w-[380px] px-5 py-4 rounded-xl shadow-2xl border flex items-center gap-3
          animate-[slideIn_0.4s_ease-out]
          ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold
            ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {toast.type === 'success' ? '✓' : '✕'}
          </div>

          <div className="flex-1">
            <p className="font-bold text-sm">
              {toast.message}
            </p>

            <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  toast.type === 'success'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                } animate-[toastProgress_5s_linear]`}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto mt-20 mb-24 px-5">

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 animate-slide-up">

          <h2 className="text-3xl font-bold text-black text-center">
            {isSuperAdminMode
              ? 'SaaS Owner Console'
              : 'NGO Workspace Login'}
          </h2>

          <p className="text-center text-gray-600 mt-2 mb-8">
            {isSuperAdminMode
              ? 'Global administration for WorkSphere.'
              : 'Enter your organization email to log in.'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-6">
              {error}
            </div>
          )}

          {!isSuperAdminMode && (
            <div className="flex gap-2 bg-gray-100 rounded-xl p-2 border border-gray-200 mb-8">

              <button
                type="button"
                onClick={() => handleRoleDomainChange('OrgAdmin')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                  formData.roleDomain === 'OrgAdmin'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                }`}
              >
                NGO Administrator
              </button>

              <button
                type="button"
                onClick={() => handleRoleDomainChange('Staff')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                  formData.roleDomain === 'Staff'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                }`}
              >
                Staff (Employee / Intern / Volunteer / Member / Director)
              </button>

            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-black mb-2">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. admin@ghf.org"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                title="Please enter a valid email address"
                required
              />
            </div>

            {/* Password */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">

                <label className="block text-sm font-semibold text-black">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
                >
                  Forgot Password?
                </Link>

              </div>

              {/* Password Input + Show/Hide Button */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  maxLength={16}
                  className="w-full px-4 py-3 pr-12 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <LogIn size={18} />

              {submitting
                ? 'Processing...'
                : 'Login Session'}
            </button>

          </form>

          {!isSuperAdminMode && (
            <div className="mt-6 text-center text-sm text-gray-600">
              NGO employee or volunteer?{' '}

              <Link
                to="/register-staff"
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                Register here to join
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Toast animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

    </PublicLayout>
  );
};

export default Login;