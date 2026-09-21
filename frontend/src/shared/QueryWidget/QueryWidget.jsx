import React, { useContext, useEffect, useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  CheckCircle2,
  User,
  Mail,
  FileText,
  MessageSquare,
  Building2,
} from 'lucide-react';

import { AppContext } from '../../context/AppContext';
import api from '../../Config/apiConfig';

const EMPTY_FORM = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
  orgId: '', // '' = general WorkSphere platform query
};

const QueryWidget = () => {
  const { submitQuery } = useContext(AppContext);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  // Organizations a visitor can address a query to (loaded when the panel
  // is first opened).
  useEffect(() => {
    if (!open || organizations.length > 0) return undefined;

    let cancelled = false;

    const load = async () => {
      setOrgsLoading(true);

      try {
        const res = await api.get('/organizations/public');

        if (!cancelled) {
          setOrganizations(res.data.organizations || []);
        }
      } catch (err) {
        // The dropdown simply stays on "WorkSphere (general)".
      } finally {
        if (!cancelled) setOrgsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: '',
      }));
    }

    if (apiError) {
      setApiError('');
    }
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = 'Name is required.';
    }

    if (!form.email.trim()) {
      next.email = 'Email is required.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      next.email = 'Enter a valid email address.';
    }

    if (!form.subject.trim()) {
      next.subject = 'Subject is required.';
    }

    if (!form.message.trim()) {
      next.message = 'Please write a message.';
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setApiError('');

    if (!validate()) return;

    setSubmitting(true);

    const res = await submitQuery({
      ...form,
      orgId: form.orgId || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setSentTo(
        organizations.find((o) => o.id === form.orgId)?.name || ''
      );
      setSubmitted(true);
      setForm(EMPTY_FORM);
      setErrors({});
    } else {
      setApiError(
        res.error || 'Could not send your message. Please try again.'
      );
    }
  };

  const handleClose = () => {
    setOpen(false);

    setTimeout(() => {
      setSubmitted(false);
      setApiError('');
      setErrors({});
    }, 200);
  };

  return (
    <>
      {/* ================= QUERY PANEL ================= */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-5 z-[90] w-[calc(100vw-2rem)] sm:w-[92vw] max-w-sm">

          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-white font-bold text-sm">
                    Have a question?
                  </p>

                  <p className="text-indigo-100 text-xs mt-1 leading-5">
                    We usually reply within 1–2 business days.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close query form"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={19} />
                </button>

              </div>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">

              {/* Success */}
              {submitted ? (
                <div className="text-center py-6">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle2 size={30} />
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-gray-900">
                    Message sent!
                  </h3>

                  <p className="text-sm text-gray-600 mt-2 leading-6">
                    {sentTo
                      ? `We've sent your message to ${sentTo} and emailed you a confirmation. Their admin will reply to you by email.`
                      : "We've received your message and sent a confirmation to your email. Our team will follow up soon."}
                  </p>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-5 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Close
                  </button>

                </div>
              ) : (

                /* Form */
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >

                  {/* Organization */}
                  <div>
                    <label
                      htmlFor="query-org"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Ask which organization?
                    </label>

                    <div className="relative">
                      <Building2
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <select
                        id="query-org"
                        name="orgId"
                        value={form.orgId}
                        onChange={handleChange}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">WorkSphere (general question)</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      {orgsLoading
                        ? 'Loading organizations…'
                        : form.orgId
                          ? 'Your question goes straight to this organization\'s admin.'
                          : 'Pick an organization to send your question to its admin.'}
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label
                      htmlFor="query-name"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Name
                    </label>

                    <div className="relative">
                      <User
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="query-name"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        autoComplete="name"
                        className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition ${
                          errors.name
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>

                    {errors.name && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="query-email"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Email
                    </label>

                    <div className="relative">
                      <Mail
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="query-email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition ${
                          errors.email
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>

                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label
                      htmlFor="query-subject"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Subject
                    </label>

                    <div className="relative">
                      <FileText
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="query-subject"
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="What's this about?"
                        className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition ${
                          errors.subject
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>

                    {errors.subject && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor="query-message"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Message
                    </label>

                    <div className="relative">
                      <MessageSquare
                        size={17}
                        className="absolute left-3.5 top-3.5 text-gray-400"
                      />

                      <textarea
                        id="query-message"
                        name="message"
                        rows={4}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us more..."
                        className={`w-full resize-none rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition ${
                          errors.message
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        }`}
                      />
                    </div>

                    {errors.message && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Honeypot */}
                  <div
                    className="absolute -left-[9999px] h-px w-px overflow-hidden"
                    aria-hidden="true"
                  >
                    <label htmlFor="query-website">
                      Leave this field empty
                    </label>

                    <input
                      id="query-website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={handleChange}
                    />
                  </div>

                  {/* API Error */}
                  {apiError && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                      <p className="text-xs font-medium text-red-600">
                        {apiError}
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Message
                      </>
                    )}
                  </button>

                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING BUTTON ================= */}
      <button
        type="button"
        onClick={() => (open ? handleClose() : setOpen(true))}
        aria-label={
          open ? 'Close query form' : 'Open query form'
        }
        className="fixed bottom-5 right-4 sm:right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200"
      >
        {open ? (
          <X size={24} />
        ) : (
          <MessageCircle size={24} />
        )}
      </button>
    </>
  );
};

export default QueryWidget;