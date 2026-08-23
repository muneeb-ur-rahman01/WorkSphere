import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  Shield,
  Sparkles,
  Mic,
  BarChart3,
  Users2,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

import PublicLayout from '../../layouts/PublicLayout';
import Team from './Team';
import HowItWorks from './HowItWorks';

const Home = () => {
  const location = useLocation();

  // If we navigated here from another page (e.g. clicking Features/Pricing/About
  // in the nav while not on the home page), smoothly scroll to the requested section.
  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <PublicLayout>

      {/* ================= HERO SECTION ================= */}

      <section className="relative overflow-hidden bg-white px-[5%] pt-16 pb-14 sm:pt-20 md:pt-24 lg:pt-[100px] lg:pb-20">

        <div className="mx-auto max-w-6xl text-center">

          <h1 className="animate-slide-up font-[var(--font-title)] text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] lg:text-[3.6rem] font-extrabold leading-[1.15] text-gray-900 max-w-5xl mx-auto mb-6">
           The Ultimate Management Operating System
          </h1>
          <h2 className='animate-slide-up font-[var(--font-title)] text-lg sm:text-xl md:text-2xl font-semibold text-blue-600 max-w-3xl mx-auto mb-4 italic'>
            "One Platform. Every Team. Every Operation"
          </h2>

          <p className="animate-slide-up font-[var(--font-body)] text-base sm:text-[1.05rem] md:text-[1.15rem] text-gray-600 max-w-3xl mx-auto leading-8 mb-10">
            A universal management platform that enables organizations to coordinate teams, manage operations, assign tasks, track resources, and stay connected, while leveraging AI-powered voice capture, intelligent analytics, workflow automation, automated annual reporting, and real-time data visualization.
          </p>

          <div className="animate-slide-up flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register-org">
              <button
                type="button"
                className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Register Your NGO Now
                <ArrowRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </Link>

            <Link to="/login-choice">
              <button
                type="button"
                className="group flex items-center justify-center px-8 py-4 font-bold text-lg text-gray-900 bg-white border-2 border-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl"
              >
                Enter Workspace
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
              <h3 className="text-2xl font-bold text-indigo-600">Multi-Tenant</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Built for Multiple Organizations</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
              <h3 className="text-2xl font-bold text-indigo-600">AI-Powered</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Intelligent Voice & Workflow Automation</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
              <h3 className="text-2xl font-bold text-indigo-600">24/7</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Operational Access</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
              <h3 className="text-2xl font-bold text-indigo-600">100%</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Centralized Data</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
              <h3 className="text-2xl font-bold text-indigo-600">Real-Time</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Analytics & Insights</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left">
              <h3 className="text-2xl font-bold text-indigo-600">Automated</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Reports & Visualizations</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section
        id="features"
        className="scroll-mt-24 px-[5%] py-16 md:py-20 bg-white border-t border-gray-200"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-4">
              Built for the Way Organizations Work.
            </h2>
            <p className="max-w-xl mx-auto text-gray-500 text-[0.95rem] leading-7 italic">
              "From team coordination to analytics and automation, WorkSphere connects every part of your organization"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="text-indigo-600" size={30} />,
                title: "Multi-Tenant SaaS Architecture",
                subtitle: "One Platform. Multiple Organizations",
                description: "Each organization operates within its own secure workspace, with dedicated users, data, settings, and modules while WorkSphere provides centralized platform management.",
              },
              {
                icon: <Users2 className="text-indigo-600" size={30} />,
                title: "Role-Based Access Control",
                subtitle: "The Right Access for Every Role",
                description: "Admins, Managers, Employees, Interns, Volunteers, and other users receive access based on their responsibilities, ensuring the right people see and manage the right information.",
              },
              {
                icon: <Zap className="text-indigo-600" size={30} />,
                title: "Smart Notifications & Availability",
                subtitle: "Stay Connected in Real Time",
                description: "Send instant announcements, task updates, event notifications, and availability requests so teams stay informed and connected without relying on manual communication.",
              },
              {
                icon: <Sparkles className="text-indigo-600" size={30} />,
                title: "Dynamic Task & Workflow Management",
                subtitle: "From Assignment to Completion",
                description: "Create, assign, prioritize, and track tasks while monitoring progress through customizable workflows, deadlines, responsibilities, and real-time status updates.",
              },
              {
                icon: <Mic className="text-indigo-600" size={30} />,
                title: "AI-Powered Voice Capture",
                subtitle: "Smart Prescription & Dose Management",
                description: "Doctors dictate prescriptions by voice, and AI converts them into structured records with medicine names, dosages, frequency, and instructions for faster and more accurate prescription management.",
              },
              {
                icon: <BarChart3 className="text-indigo-600" size={30} />,
                title: "Analytics, Reports & Visualizations",
                subtitle: "Smart Insights",
                description: "Track organizational performance, analyze activities, monitor key metrics, and automatically generate reports, dashboards, and visualizations to support data-driven decision-making.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-indigo-600 font-semibold mb-4">{item.subtitle}</p>
                <p className="text-gray-500 leading-7 text-[0.92rem]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24">
        <HowItWorks />
      </section>

      {/* ================= ABOUT SECTION ================= */}
      <section
        id="about"
        className="scroll-mt-24 px-[5%] py-16 md:py-20 border-t border-gray-200"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
          <div>
            <h1 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-3">
              About WorkSphere
            </h1>
            <h2 className="text-lg sm:text-xl font-semibold text-indigo-600 mb-1">
              The Ultimate Management Operating System
            </h2>
            <p className="text-sm sm:text-base font-medium text-gray-500 italic mb-6">
              "One Platform. Every Team. Every Operation"
            </p>
            <p className="text-gray-600 leading-8 text-[1rem] mb-4">
              WorkSphere is Hopefelt Foundation’s flagship management platform, connecting people, teams, workflows, operations, and data through one secure, scalable, multi-tenant workspace.
            </p>
            <p className="text-gray-600 leading-8 text-[1rem] mb-8">
              From managing everyday operations to enabling real-time analytics, automated reporting, workflow automation, and AI-powered tools, WorkSphere helps organizations work efficiently, make informed decisions, and create greater impact with fewer resources.
            </p>
            <Link to="/about">
              <button
                type="button"
                className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Learn More About Us
                <ArrowRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-left">
              <Heart className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Mission</h3>
              <p className="text-sm text-gray-500 leading-6">
                Empowering organizations to work smarter, optimize resources, and create greater impact.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-left">
              <Users2 className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Team</h3>
              <p className="text-sm text-gray-500 leading-6">
                Building technology around the people who manage, coordinate, and deliver meaningful work.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-left">
              <Shield className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Promise</h3>
              <p className="text-sm text-gray-500 leading-6">
                Providing secure, scalable, and reliable technology organizations can trust.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-left">
              <Sparkles className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Vision</h3>
              <p className="text-sm text-gray-500 leading-6">
                A world where every organization can manage its people, operations, and data through one intelligent platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Team />

      {/* ================= PRICING SECTION ================= */}
      <section
        id="pricing"
        className="scroll-mt-24 px-[5%] py-20 md:py-24 border-t border-sky-100 bg-gradient-to-b from-sky-100/60 via-sky-50/40 to-white"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100">
              Pricing Plans
            </span>
            <h2 className="text-[2rem] sm:text-[2.4rem] md:text-[2.8rem] font-extrabold mb-4 text-gray-900 tracking-tight">
              Flexible Subscription Plans
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
              Choose the plan that fits your organization. Scale seamlessly as your teams, operations, and needs grow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Basic Plan */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-8 shadow-xl shadow-gray-100/80 hover:shadow-2xl hover:border-gray-300 transition-all duration-300 flex flex-col justify-between group text-left">
              <div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Basic Plan</h3>
                  <p className="text-sm text-gray-500 mt-1.5">For small teams and growing organizations</p>
                </div>

                <div className="flex items-baseline gap-1 mt-6 pb-6 border-b border-gray-100">
                  <span className="text-4xl font-black text-gray-900 tracking-tight">Rs. 10,000</span>
                  <span className="text-sm text-gray-400 font-medium">/month</span>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-gray-600">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>1 Organization Workspace</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Up to 15 Staff Members</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Basic Team and Role Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Task & Workflow Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Events & Schedule Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />
                    <span>Core Notifications & Alerts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />
                    <span>Centralized Operational Data</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />
                    <span>Basic Dashboard & Activity Tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />
                    <span>Standard Support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link to="/register-org" className="block w-full">
                  <button
                    type="button"
                    className="w-full group flex items-center justify-center gap-2 py-3.5 font-bold text-base rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-900 shadow-sm transition-all duration-300"
                  >
                    Select Basic
                  </button>
                </Link>
              </div>
            </div>

            {/* Standard Plan */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-8 shadow-xl shadow-gray-100/80 hover:shadow-2xl hover:border-gray-300 transition-all duration-300 flex flex-col justify-between group text-left">
              <div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Standard Plan</h3>
                  <p className="text-sm text-gray-500 mt-1.5">For growing organizations and expanding teams</p>
                </div>

                <div className="flex items-baseline gap-1 mt-6 pb-6 border-b border-gray-100">
                  <span className="text-4xl font-black text-gray-900 tracking-tight">Rs. 30,000</span>
                  <span className="text-sm text-gray-400 font-medium">/month</span>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-gray-600">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>1 Organization Workspace</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Up to 60 Team Members</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Advanced Team & Role Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Full Task & Workflow Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Events & Schedule Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Priority Notifications & Alerts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Advanced Dashboard & Activity Tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-indigo-600 flex-shrink-0" size={18} />
                    <span>Priority Support</span>
                  </li>
                  <li className="flex items-center gap-3 text-transparent select-none pointer-events-none">
                    <CheckCircle2 size={18} className="opacity-0" />
                    <span>Placeholder Feature</span>
                  </li>
                  <li className="flex items-center gap-3 text-transparent select-none pointer-events-none">
                    <CheckCircle2 size={18} className="opacity-0" />
                    <span>Placeholder Feature</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link to="/register-org" className="block w-full">
                  <button
                    type="button"
                    className="w-full group flex items-center justify-center gap-2 py-3.5 font-bold text-base rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-900 shadow-sm transition-all duration-300"
                  >
                    Select Standard
                  </button>
                </Link>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-3xl border-2 border-sky-400 bg-gradient-to-b from-sky-50/70 via-white to-white p-8 shadow-xl shadow-sky-100/50 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-left">
              <div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">Premium Plan</h3>
                  <p className="text-sm text-gray-500 mt-1.5">For large organizations and complex operations</p>
                </div>

                <div className="flex items-baseline gap-1 mt-6 pb-6 border-b border-sky-100">
                  <span className="text-4xl font-black text-sky-600 tracking-tight">Rs. 80,000</span>
                  <span className="text-sm text-gray-400 font-medium">/month</span>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-gray-700 font-medium">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>1 Organization Workspace</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Unlimited Projects & Events</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Unlimited Users & Role Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Advanced Task & Workflow Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>AI-Powered Voice Capture</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Advanced Analytics & Insights</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Automated Reports & Visualizations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Workflow Automation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Advanced Notifications & Alerts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-sky-600 flex-shrink-0" size={18} />
                    <span>Priority 24/7 Support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link to="/register-org" className="block w-full">
                  <button
                    type="button"
                    className="w-full group flex items-center justify-center gap-2 py-3.5 font-bold text-base rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-200 hover:shadow-xl transition-all duration-300"
                  >
                    Select Premium
                  </button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Home;