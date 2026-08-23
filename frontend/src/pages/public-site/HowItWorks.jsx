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
      title: "Create Your Organization",
      subText: "Register & Set Up Your Workspace",
      description:
        "Register your organization, configure its workspace, and set up users, roles, and modules.",
      icon: Building2,
      badge: "Super Admin & Org",
    },
    {
      step: "02",
      title: "Connect Your People & Operations",
      subText: "Build Teams & Manage Work",
      description:
        "Bring teams together, assign responsibilities, and manage tasks, projects, events, and workflows.",
      icon: Calendar,
      badge: "Operations",
    },
    {
      step: "03",
      title: "Track, Analyze & Automate",
      subText: "Turn Operations Into Actionable Insights",
      description:
        "Monitor operations in real time, analyze performance, and generate automated reports and visualizations.",
      icon: BarChart3,
      badge: "Analytics & Growth",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 py-20  px-4 sm:px-6 lg:px-8 border-t border-gray-200"
    >
      <div className="max-w-7xl mx-auto">

        {/* ================= SECTION HEADER ================= */}

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-4 mb-4">
            How WorkSphere Operates
          </h2>

          <p className="text-gray-600 text-base sm:text-lg leading-7 italic">
            "A secure, scalable, multi-tenant ecosystem that connects organizations, people, workflows, and data enabling seamless operations from setup and team management to real-time execution, intelligent analytics, and automated reporting."
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

                  {/* Icon + Subtext right next to it */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {item.subText}
                    </span>
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
                Want to join as a Volunteer, Intern, or Staff/Employee?
              </h4>

              <p className="text-gray-600 text-sm mt-1">
                Apply directly to your preferred organization and get assigned to active tasks.
              </p>
            </div>
          </div>

          <Link
            to="/register-staff"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden shrink-0"
          >
            <span className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <span>Register / Apply Now</span>
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