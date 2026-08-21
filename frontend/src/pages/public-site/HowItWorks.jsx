import React from "react";
import {
  Building2,
  UserCheck,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Organization Registration & Approval",
      description:
        "Medical NGOs, companies, or organizations sign up on the platform. The Super Admin reviews the request, verifies details, and approves the account for secure system access.",
      icon: Building2,
      badge: "Super Admin & Org",
    },
    {
      step: "02",
      title: "Team & Camp Management",
      description:
        "Approved organizations can seamlessly create medical camps, events, and schedules. Onboard employees, interns, volunteers, and members, and assign role-based tasks efficiently.",
      icon: Calendar,
      badge: "Operations",
    },
    {
      step: "03",
      title: "Execution, Tasks & Real-Time Analytics",
      description:
        "Manage field operations in real-time, evaluate team performance, capture AI voice-prescriptions, and monitor comprehensive analytics and reports from a unified dashboard.",
      icon: BarChart3,
      badge: "Analytics & Growth",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 py-20 bg-gray-50 px-4 sm:px-6 lg:px-8 border-t border-gray-200"
    >
      <div className="max-w-7xl mx-auto">

        {/* ================= SECTION HEADER ================= */}

        <div className="text-center max-w-3xl mx-auto mb-16">

          {/* <span className="inline-flex text-indigo-600 font-semibold text-sm tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            Seamless Workflow
          </span> */}

          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-4 mb-4">
            How WorkSphere Operates
          </h2>

          <p className="text-gray-600 text-base sm:text-lg leading-7">
            A streamlined multi-tenant ecosystem designed to connect
            organizations, empower teams, and simplify administrative
            workflows.
          </p>

        </div>

        {/* ================= STEPS GRID ================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

          {steps.map((item, index) => {
            const IconComponent = item.icon;

            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1"
              >

                <div>
                  {/* Number + Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-black text-gray-200 group-hover:text-indigo-500 transition-colors duration-300">
                      {item.step}
                    </span>
                    <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                      {item.badge}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Accent */}

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              </div>
            );
          })}

        </div>

        {/* ================= BOTTOM CTA ================= */}

        <div className="mt-16 bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">

              <UserCheck className="w-6 h-6" />

            </div>

            <div>

              <h4 className="text-lg font-bold text-gray-900">
                Want to join as a Volunteer, Intern, or Staff?
              </h4>

              <p className="text-gray-600 text-sm mt-1">
                Apply directly to your preferred organization and get
                assigned to active.
              </p>

            </div>

          </div>

   {/* <Link to="/register-org">
                <button className="px-5 py-2.5 rounded-lg border border-indigo-600 text-indigo-600 font-medium hover:bg-indigo-600 hover:text-white transition-all duration-300">
                  Register NGO
                </button>
              </Link> */}
          {/* <button
            type="button"
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm shrink-0"
          >
            Register / Apply Now
          </button> */}
                <Link
            to="/register-staff"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-sm text-white bg-gradient-to-r           from-indigo-600 via-indigo-700 to-purple-600 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all           duration-300 overflow-hidden shrink-0"
          >
            {/* Subtle shine effect on hover */}
           <span className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300          pointer-events-none" />

           <span>Register / Apply Now</span>
  
           {/* Arrow icon that moves slightly on hover */}
           <svg 
             className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" 
             fill="none" 
             stroke="currentColor" 
              strokeWidth="2.5" 
             viewBox="0 0 24 24"
           >
             <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
           </svg>
          </Link>         
        </div>

      </div>
    </section>
  );
}