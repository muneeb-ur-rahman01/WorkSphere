import React, { useState, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { LogIn, Key, Heart } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Input from '../../shared/Input/Input';
import Card from '../../shared/Card/Card';

const Login = () => {
  const { type } = useParams(); // 'superadmin' or 'org'
  const { login } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roleDomain: type === 'superadmin' ? 'SuperAdmin' : 'OrgAdmin' // OrgAdmin or Staff toggle
  });
  
  const [error, setError] = useState('');

  const isSuperAdminMode = type === 'superadmin';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleDomainChange = (domain) => {
    setFormData({ ...formData, roleDomain: domain });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    const expectedDomain = isSuperAdminMode ? 'SuperAdmin' : formData.roleDomain;
    setSubmitting(true);
    const res = await login(formData.email, formData.password, expectedDomain);
    setSubmitting(false);

    if (res.success) {
      if (res.user.role === 'SuperAdmin') {
        navigate('/super-admin/dashboard');
      } else if (res.user.role === 'OrgAdmin') {
        navigate('/org-admin/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
    } else {
      setError(res.error || 'Authentication failed.');
    }
  };

  return (
  <PublicLayout>
    <div className="max-w-2xl mx-auto mt-20 mb-24 px-5">

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 animate-slide-up">

        <h2 className="text-3xl font-bold text-black text-center">
          {isSuperAdminMode
            ? "SaaS Owner Console"
            : "NGO Workspace Login"}
        </h2>

        <p className="text-center text-gray-600 mt-2 mb-8">
          {isSuperAdminMode
            ? "Global administration for CampOS."
            : "Enter your organization email to log in."}
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
              onClick={() => handleRoleDomainChange("OrgAdmin")}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                formData.roleDomain === "OrgAdmin"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              NGO Administrator
            </button>

            <button
              type="button"
              onClick={() => handleRoleDomainChange("Staff")}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                formData.roleDomain === "Staff"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              Staff (Employee / Intern / Volunteer / Member / Director)
            </button>

          </div>
        )}

        <form onSubmit={handleSubmit}>

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

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
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
            <LogIn size={18} />
            {submitting ? 'Authenticating...' : 'Authenticate Session'}
          </button>

        </form>

        {/* Demo Credentials */}
        {/* <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-gray-700">

          <h4 className="font-bold text-black mb-3">
            Demo Credentials (Seed Data)
          </h4>

          <ul className="space-y-2">
            {isSuperAdminMode ? (
              <li>
                • <strong>Super Admin:</strong>{" "}
                <code className="bg-white px-2 py-1 rounded">
                  superadmin@campos.com
                </code>{" "}
                /{" "}
                <code className="bg-white px-2 py-1 rounded">
                  password
                </code>
              </li>
            ) : (
              <>
                <li>
                  • <strong>NGO Admin:</strong>{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    admin@ghf.org
                  </code>{" "}
                  /{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    password
                  </code>
                </li>

                <li>
                  • <strong>Employee:</strong>{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    employee@ghf.org
                  </code>{" "}
                  /{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    password
                  </code>
                </li>

                <li>
                  • <strong>Intern:</strong>{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    intern@ghf.org
                  </code>{" "}
                  /{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    password
                  </code>
                </li>

                <li>
                  • <strong>Volunteer:</strong>{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    volunteer@ghf.org
                  </code>{" "}
                  /{" "}
                  <code className="bg-white px-2 py-1 rounded">
                    password
                  </code>
                </li>
              </>
            )}
          </ul>
        </div> */}

        {!isSuperAdminMode && (
          <div className="mt-6 text-center text-sm text-gray-600">
            NGO employee or volunteer?{" "}
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
  </PublicLayout>
);
};

export default Login;
