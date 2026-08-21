import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Building2, Heart } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Input from '../../shared/Input/Input';
import Card from '../../shared/Card/Card';
import { SUBSCRIPTION_PLANS } from '../../Config/constant';

const RegisterOrganization = () => {
  const { registerOrganization, payWithGateway } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    orgName: '',
    adminName: '',
    email: '',
    password: '',
    plan: 'Basic'
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [registeredOrgId, setRegisteredOrgId] = useState(null);
  const [paymentDueAt, setPaymentDueAt] = useState(null);
  const [payError, setPayError] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.orgName || !formData.adminName || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      const res = await registerOrganization(
        formData.orgName,
        formData.adminName,
        formData.email,
        formData.password,
        formData.plan
      );
      if (res.success) {
        setRegisteredOrgId(res.orgId);
        setPaymentDueAt(res.paymentDueAt || null);
        setSuccess(true);
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setError('An error occurred during registration.');
    }
  };

  const handlePayNow = async () => {
    setPayError('');
    setPayLoading(true);
    const res = await payWithGateway(registeredOrgId, formData.plan);
    // On success, payWithGateway submits a form and navigates the browser
    // away to the payment gateway, so this line only runs if it failed.
    if (!res.success) {
      setPayError(res.error || 'Could not start the payment gateway checkout.');
      setPayLoading(false);
    }
  };

 return (
  <PublicLayout>
    <div className="max-w-xl mx-auto mt-16 mb-24 px-5">
      {success ? (
        <Card className="animate-scale-up bg-white border border-gray-200 rounded-2xl shadow-xl p-10 text-center">
          <div className="inline-flex p-4 rounded-full bg-green-100 text-green-600 mb-6">
            <CheckCircle2 size={48} />
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            Organization Registered!
          </h2>

          <p className="text-gray-700 text-sm leading-7 mb-4">
            Your workspace request for <strong>{formData.orgName}</strong> has
            been submitted. As a multi-tenant SaaS platform, our{" "}
            <strong>Super Admin</strong> must review and approve your
            subscription. You will receive an activation confirmation shortly.
          </p>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-gray-700 text-left mb-6">
            <p className="font-semibold text-black mb-1">
              Finish setting up your subscription
            </p>
            <p className="text-gray-600">
              You selected the <strong>{SUBSCRIPTION_PLANS[formData.plan]?.label}</strong>{" "}
              ({SUBSCRIPTION_PLANS[formData.plan]?.priceLabel}). Pay securely
              now to activate billing right away, or pay any time within
              the next 10 days
              {paymentDueAt ? (
                <> (by <strong>{new Date(paymentDueAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>)</>
              ) : null}. Your Super Admin approval still needs to happen
              separately.
            </p>
            {payError && (
              <p className="text-red-600 text-xs mt-2">{payError}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              fullWidth
              disabled={payLoading}
              onClick={handlePayNow}
              className="flex items-center justify-center gap-2"
            >
              {payLoading ? 'Redirecting to secure checkout…' : `Pay Now — ${SUBSCRIPTION_PLANS[formData.plan]?.priceLabel}`}
            </Button>

            <div className="flex flex-col gap-3">
  <Link to="/login-choice">
    <Button
      variant="primary"
      fullWidth
      className="!rounded-2xl !bg-gradient-to-r !from-indigo-600 !via-indigo-500 !to-violet-600 !text-white !font-bold !shadow-lg !shadow-indigo-500/25 hover:!from-indigo-700 hover:!via-indigo-600 hover:!to-violet-700 hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300"
    >
      Pay Later — Go to Login Page
    </Button>
  </Link>

  <Link to="/">
    <Button
      variant="primary"
      fullWidth
      className="!rounded-2xl !bg-gradient-to-r !from-indigo-600 !via-indigo-500 !to-violet-600 !text-white !font-bold !shadow-lg !shadow-indigo-500/25 hover:!from-indigo-700 hover:!via-indigo-600 hover:!to-violet-700 hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300"
    >
      Return to Home
    </Button>
  </Link>
</div>
          </div>
        </Card>
      ) : (
        <Card
          title="Register Your Organization"
          subtitle="Launch your dedicated CampOS Medical Camp management portal."
          className="animate-slide-up bg-white border border-gray-200 rounded-2xl shadow-xl p-8"
        >
          {error && (
            <div className="bg-red-50 border border-red-500 text-red-600 rounded-lg p-3 text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Organization Name */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-black mb-2">
                Organization / NGO Name
              </label>

              <input
                type="text"
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                placeholder="e.g. Hope Welfare Association"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Admin Name */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-black mb-2">
                Primary Administrator Name
              </label>

              <input
                type="text"
                name="adminName"
                value={formData.adminName}
                onChange={handleChange}
                placeholder="e.g. Dr. Ahmed Ali"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Email */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-black mb-2">
                Administrator Email Address
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. admin@hopewelfare.org"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

                        {/* Password */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-black mb-2">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Choose a secure password"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Subscription Plan */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2">
                Choose SaaS Subscription Plan
              </label>

              <select
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {Object.values(SUBSCRIPTION_PLANS).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label} — {p.priceLabel} ({p.perks})
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-500 mt-2">
                You'll have 10 days after registering to complete payment before
                the plan renews monthly. Payment is processed securely via our
                payment gateway on the next step — your card details are never
                stored on our servers.
              </p>
            </div>

            {/* Note */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-6 mb-6">
              📌 <strong>Note:</strong> Under our multi-tenant SaaS terms,
              once Super Admin approves this workspace request, you will become
              the primary administrator and can invite, approve, and manage
              your employees, volunteers, and interns.
            </div>

            <Button
              type="submit"
              variant="secondary"
              fullWidth
              className="group flex items-center justify-center gap-2 py-3 text-base font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Submit Registration Request
              <ChevronRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link
              to="/login-choice"
              className="font-semibold text-black hover:text-indigo-600 transition"
            >
              Login here
            </Link>
          </div>
        </Card>
      )}
    </div>
  </PublicLayout>
);
};

export default RegisterOrganization;
