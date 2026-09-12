import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Lock,
  User,
  BriefcaseBusiness,
} from 'lucide-react';

import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';
import api from '../../Config/apiConfig';
import { SELF_REGISTERABLE_ROLES } from '../../Config/constant';
import {
  isValidStaffPassword,
  STAFF_PASSWORD_MESSAGE,
} from '../../utils/passwordValidation';

const Register = () => {
  const { registerStaff } = useContext(AppContext);

  const [activeOrgs, setActiveOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Employee',
    orgId: '',
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOrgs = async () => {
      try {
        const res = await api.get('/organizations/public');

        if (!cancelled) {
          setActiveOrgs(res.data.organizations || []);
        }
      } catch (err) {
        if (!cancelled) {
          setOrgsError(
            'Could not load organizations. Please refresh the page.'
          );
        }
      } finally {
        if (!cancelled) {
          setOrgsLoading(false);
        }
      }
    };

    loadOrgs();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'password') {
      setPasswordTouched(true);
    }

    if (error) {
      setError('');
    }
  };

  const passwordValid = isValidStaffPassword(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.orgId ||
      !formData.role
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (!passwordValid) {
      setPasswordTouched(true);
      setError(STAFF_PASSWORD_MESSAGE);
      return;
    }

    try {
      setSubmitting(true);

      const res = await registerStaff(
        formData.fullName,
        formData.email,
        formData.password,
        formData.role,
        formData.orgId
      );

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOrgName =
    activeOrgs.find((o) => o.id === formData.orgId)?.name ||
    'the selected NGO';

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:py-16">

        <div className="mx-auto w-full max-w-xl">

          {/* Success State */}
          {success ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

              {/* Success Header */}
              <div className="bg-gradient-to-br from-emerald-50 via-white to-indigo-50 px-6 py-10 text-center sm:px-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
                  <CheckCircle2 size={44} strokeWidth={2} />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Application Sent!
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Your registration request has been successfully submitted.
                </p>
              </div>

              {/* Success Content */}
              <div className="px-6 py-7 sm:px-10">

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm leading-7 text-slate-600">
                    Hi{' '}
                    <strong className="font-bold text-slate-900">
                      {formData.fullName}
                    </strong>
                    , your request to register as a{' '}
                    <strong className="font-bold text-slate-900">
                      {formData.role}
                    </strong>{' '}
                    for{' '}
                    <strong className="font-bold text-slate-900">
                      {selectedOrgName}
                    </strong>{' '}
                    has been logged.
                  </p>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    The organization administrator must review and accept
                    your registration request. Once approved, you'll receive
                    an email and can log in to access your task dashboard
                    and submit camp availability.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <Link
                    to="/login-choice"
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    Go to Login Page
                  </Link>

                  <Link
                    to="/"
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Registration Card */
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

              {/* Header */}
              <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-6 py-7 sm:px-8">

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <UserCheck size={24} />
                </div>

                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Register as NGO/Company Staff
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Register as an Employee, Intern, Volunteer, or Member
                  for an approved NGO.
                </p>
              </div>

              <div className="px-6 py-7 sm:px-8">

                {/* Error */}
                {error && (
                  <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <p className="leading-5">{error}</p>
                  </div>
                )}

                {/* Loading */}
                {orgsLoading ? (
                  <div className="py-12 text-center">

                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

                    <p className="text-sm font-medium text-slate-500">
                      Loading organizations…
                    </p>
                  </div>
                ) : orgsError ? (
                  /* Organization Error */
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertCircle size={22} />
                    </div>

                    <p className="text-sm font-semibold text-red-700">
                      {orgsError}
                    </p>

                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Refresh Page
                    </button>
                  </div>
                ) : activeOrgs.length === 0 ? (
                  /* No Organizations */
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">

                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Building2 size={22} />
                    </div>

                    <h3 className="font-bold text-amber-900">
                      No Active Organizations
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-amber-700">
                      No active organizations were found on the platform
                      yet. Please register an organization first before
                      staff can sign up.
                    </p>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="fullName"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Full Name
                      </label>

                      <div className="relative">
                        <User
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="e.g. John Doe"
                          value={formData.fullName}
                          onChange={handleChange}
                          required
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Official Email
                      </label>

                      <div className="relative">
                        <Mail
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="e.g. johndoe@gmail.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Password
                      </label>

                      <div className="relative">
                        <Lock
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                        id="password"
                        name="password"
                        type="password"
                        maxLength={8}
                        placeholder="At least 8 characters, with a letter and a number"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={() => setPasswordTouched(true)}
                        required
                        className={`h-12 w-full rounded-xl border bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                          passwordTouched &&
                          formData.password &&
                          !passwordValid
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                            : 'border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:ring-indigo-100'
                        }`}
                      />
                      </div>

                      {passwordTouched &&
                        formData.password &&
                        !passwordValid && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-600">
                            <AlertCircle
                              size={14}
                              className="mt-0.5 shrink-0"
                            />
                            {STAFF_PASSWORD_MESSAGE}
                          </p>
                        )}
                    </div>

                    {/* Organization */}
                    <div>
                      <label
                        htmlFor="orgId"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Organization
                      </label>

                      <div className="relative">
                        <Building2
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <select
                          id="orgId"
                          name="orgId"
                          value={formData.orgId}
                          onChange={handleChange}
                          required
                          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">
                            Choose NGO to join...
                          </option>

                          {activeOrgs.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label
                        htmlFor="role"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Position / Role
                      </label>

                      <div className="relative">
                        <BriefcaseBusiness
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          required
                          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          {SELF_REGISTERABLE_ROLES.map((role) => (
                            <option
                              key={role.value}
                              value={role.value}
                            >
                              {role.label} — {role.description}
                            </option>
                          ))}
                        </select>

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <UserCheck size={17} />
                          Request Workspace Access
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Login */}
                <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
                  Already registered?{' '}
                  <Link
                    to="/login-choice"
                    className="font-bold text-indigo-600 transition hover:text-indigo-700 hover:underline"
                  >
                    Login here
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
};

export default Register;
