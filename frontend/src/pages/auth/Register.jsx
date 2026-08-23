import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, CheckCircle2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';
import api from '../../Config/apiConfig';
import { SELF_REGISTERABLE_ROLES } from '../../Config/constant';
import { isValidStaffPassword, STAFF_PASSWORD_MESSAGE } from '../../utils/passwordValidation';

const Register = () => {
  const { registerStaff } = useContext(AppContext);

  const [activeOrgs, setActiveOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadOrgs = async () => {
      try {
        const res = await api.get('/organizations/public');
        if (!cancelled) setActiveOrgs(res.data.organizations || []);
      } catch (err) {
        if (!cancelled) setOrgsError('Could not load organizations. Please refresh the page.');
      } finally {
        if (!cancelled) setOrgsLoading(false);
      }
    };
    loadOrgs();
    return () => { cancelled = true; };
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Employee',
    orgId: ''
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const passwordValid = isValidStaffPassword(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.email || !formData.password || !formData.orgId || !formData.role) {
      setError('Please fill in all fields.');
      return;
    }

    if (!passwordValid) {
      setPasswordTouched(true);
      setError(STAFF_PASSWORD_MESSAGE);
      return;
    }

    setSubmitting(true);
    const res = await registerStaff(
      formData.fullName,
      formData.email,
      formData.password,
      formData.role,
      formData.orgId
    );
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  const selectedOrgName = activeOrgs.find(o => o.id === formData.orgId)?.name || 'the selected NGO';

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto my-16 px-4 sm:px-6">
        {success ? (
          <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 text-center border border-gray-100">
            <div className="inline-flex bg-emerald-50 p-4 rounded-full text-emerald-600 mb-6 shadow-sm">
              <CheckCircle2 size={48} />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Sent!</h2>
            
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              Hi <strong className="text-gray-900">{formData.fullName}</strong>, your request to register as a <strong className="text-gray-900">{formData.role}</strong> 
              for <strong className="text-gray-900">{selectedOrgName}</strong> has been logged. 
              The organization administrator must review and accept your registration request. 
              Once approved, you'll receive an email and can log in to access your task dashboard and submit camp availability.
            </p>

            <div className="flex flex-col gap-3">
              <Link to="/login-choice">
                <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-sm">
                  Go to Login Page
                </button>
              </Link>
              <Link to="/">
                <button className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">
                  Back to Home
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 border border-gray-100">
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Register as NGO Staff</h2>
              <p className="text-sm text-gray-500">
                Register as an Employee, Intern, Volunteer, or Member for an approved NGO.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs mb-5 font-medium">
                {error}
              </div>
            )}

            {orgsLoading ? (
              <div className="text-gray-500 py-10 text-sm text-center animate-pulse">
                Loading organizations…
              </div>
            ) : orgsError ? (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm text-center font-medium">
                {orgsError}
              </div>
            ) : activeOrgs.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm text-center font-medium">
                ⚠️ No active organizations found on the platform yet. 
                Please register an organization first before staff can sign up!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="e.g. John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Official Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. johndoe@gmail.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="At least 8 characters, with a letter and a number"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => setPasswordTouched(true)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  {passwordTouched && formData.password && !passwordValid && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{STAFF_PASSWORD_MESSAGE}</p>
                  )}
                </div>

                {/* Organization */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Organization <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="orgId"
                    value={formData.orgId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  >
                    <option value="">Choose NGO to join...</option>
                    {activeOrgs.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {/* Position / Role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Position / Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  >
                    {SELF_REGISTERABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <UserCheck size={18} /> 
                    {submitting ? 'Submitting…' : 'Request Workspace Access'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
              Already registered? <Link to="/login-choice" className="text-indigo-600 font-semibold hover:underline">Login here</Link>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default Register;