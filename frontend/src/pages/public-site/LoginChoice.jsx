import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Building2, ArrowRight } from 'lucide-react';
import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Card from '../../shared/Card/Card';

const LoginChoice = () => {
return (
  <PublicLayout>
    <div className="max-w-4xl mx-auto mt-20 mb-24 px-5 text-center">

      <h1 className="text-4xl font-bold text-black mb-3">
        Choose Workspace Gateway
      </h1>

      <p className="text-gray-600 mb-12">
        Please select your dashboard type to access your CampOS panels.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* NGO Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center px-8 py-10">

          <div className="bg-indigo-100 p-5 rounded-full text-indigo-600 mb-5">
            <Building2 size={36} />
          </div>

          <h3 className="text-2xl font-bold text-black mb-3">
            NGO & Staff Workspace
          </h3>

          <p className="text-gray-600 text-sm leading-6 mb-8 flex-grow">
            Log in as an <strong>Organization Admin</strong> to manage camps,
            or as a registered <strong>Employee, Intern, Volunteer, Member, or Executive Director</strong>
            {" "}to view tasks and submit availability.
          </p>

          <Link to="/login/org" className="w-full">
            <button
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Enter NGO Portal
              <ArrowRight size={18} />
            </button>
          </Link>

        </div>
                {/* Super Admin Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center px-8 py-10">

          <div className="bg-purple-100 p-5 rounded-full text-purple-600 mb-5">
            <ShieldAlert size={36} />
          </div>

          <h3 className="text-2xl font-bold text-black mb-3">
            SaaS Super Admin
          </h3>

          <p className="text-gray-600 text-sm leading-6 mb-8 flex-grow">
            Log in as the <strong>SaaS Platform Owner (Super Admin)</strong> to
            review pending organizations, monitor plans, view monthly revenue,
            and configure system settings.
          </p>

          <Link to="/login/superadmin" className="w-full">
            <button
              className="w-full flex items-center justify-center gap-2 border-2 border-purple-600 text-purple-600 py-3 rounded-xl font-bold shadow-md hover:bg-purple-600 hover:text-white hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              System Admin Console
              <ArrowRight size={18} />
            </button>
          </Link>

        </div>

      </div>

      <p className="mt-10 text-sm text-gray-600">
        Need a workspace for your medical camp?{" "}
        <Link
          to="/register-org"
          className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          Register your NGO here
        </Link>
      </p>

    </div>
  </PublicLayout>
);
};

export default LoginChoice;