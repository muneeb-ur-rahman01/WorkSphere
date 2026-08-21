import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  Shield,
  Sparkles,
  Mic,
  FileText,
  BarChart3,
  Users2,
  Zap,
  ArrowRight,
  CheckCircle2,
  Target,
} from 'lucide-react';

import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Card from '../../shared/Card/Card';
import Team from './Team';

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

          {/* <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 mb-8">
            <Heart size={16} />
            Trusted Medical Camp Management Platform
          </div> */}

          <h1 className="animate-slide-up font-[var(--font-title)] text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] lg:text-[3.6rem] font-extrabold leading-[1.15] text-gray-900 max-w-5xl mx-auto mb-6">
  The Ultimate Management Operating System
</h1>

<h2 className='animate-slide-up font-[var(--font-title)] text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 max-w-3xl mx-auto mb-4'>
  One Platform. Every Team. Every Operation.
</h2>

<p className="animate-slide-up font-[var(--font-body)] text-base sm:text-[1.05rem] md:text-[1.15rem] text-gray-600 max-w-3xl mx-auto leading-8 mb-10">
  A universal platform empowering medical NGOs to coordinate
  emergencies, track availability, assign tasks, and capture
  AI voice-prescriptions in real-time.
</p>

          <div className="animate-slide-up flex flex-col sm:flex-row items-center justify-center gap-4">

           <Link to="/register-org">
  <Button
    size="large"
    variant="secondary"
    className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
  >
    Register Your NGO Now
    <ArrowRight
      size={20}
      className="transition-transform duration-300 group-hover:translate-x-1"
    />
  </Button>
</Link>

<Link to="/login-choice">
  <Button
    size="large"
    variant="secondary"
    className="group flex items-center justify-center px-8 py-4 font-bold text-lg rounded-xl border-2 border-primary hover:bg-primary  shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
  >
    Enter Workspace
  </Button>
</Link>

          </div>

          {/* Stats */}

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-3xl font-bold text-indigo-600">500+</h3>
              <p className="mt-2 text-sm text-gray-500">
                Medical Camps
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-3xl font-bold text-indigo-600">10K+</h3>
              <p className="mt-2 text-sm text-gray-500">
                Volunteers
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-3xl font-bold text-indigo-600">99.9%</h3>
              <p className="mt-2 text-sm text-gray-500">
                Uptime
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-3xl font-bold text-indigo-600">24/7</h3>
              <p className="mt-2 text-sm text-gray-500">
                Support
              </p>
            </Card>

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
              Powering Humanitarian Relief Camps
            </h2>

            <p className="max-w-xl mx-auto text-gray-500 text-[0.95rem] leading-7">
              Everything your NGO admins, doctors, interns, and volunteers
              need to execute camp diagnostics seamlessly.
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {[
              {
                icon: <Shield className="text-indigo-600" size={30} />,
                title: "Multi-Tenant SaaS Security",
                subtitle: "Role-Based Modules",
                description:
                  "Your NGO dashboard displays only your camp records. Protected by bank-grade data architecture, each workspace behaves like an independent ecosystem.",
              },
              {
                icon: <Users2 className="text-indigo-600" size={30} />,
                title: "Role-Based Workspace Matrix",
                subtitle: "Admins, Staff & Volunteers",
                description:
                  "Separate control layers for organization Admins, salaried Employees, Interns seeking experience, and local Volunteers.",
              },
              {
                icon: <Zap className="text-indigo-600" size={30} />,
                title: "Broadcast & Availability Alerts",
                subtitle: "No more manual calling",
                description:
                  "Employees receive instant alerts and can submit their availability with one click.",
              },
              {
                icon: <Sparkles className="text-indigo-600" size={30} />,
                title: "Dynamic Task Progression",
                subtitle: "Collaborative Workflow",
                description:
                  "Assign tasks instantly and monitor progress from Pending to Completed with live updates.",
              },
              {
                icon: <Mic className="text-indigo-600" size={30} />,
                title: "AI Voice Prescription",
                subtitle: "Fast Consultation",
                description:
                  "Doctors dictate prescriptions and AI instantly converts speech into structured medical notes.",
              },
              {
                icon: <BarChart3 className="text-indigo-600" size={30} />,
                title: "Analytics & Reports",
                subtitle: "Smart Insights",
                description:
                  "Generate reports, monitor volunteers, export data and analyze overall camp performance.",
              },
            ].map((item, index) => (

              <Card
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >

                <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                  {item.icon}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>

                <p className="text-indigo-600 font-semibold mb-4">
                  {item.subtitle}
                </p>

                <p className="text-gray-500 leading-7 text-[0.92rem]">
                  {item.description}
                </p>

              </Card>

            ))}

          </div>

        </div>

      </section>

      {/* ================= ABOUT SECTION ================= */}

      <section
        id="about"
        className="scroll-mt-24 px-[5%] py-16 md:py-20 bg-gray-50 border-t border-gray-200"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 mb-6">
              <Target size={16} />
              About WorkSphere
            </div>

            <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-5">
              Built To Help Medical NGOs Do More With Less
            </h2>

            <p className="text-gray-600 leading-8 text-[0.98rem] mb-4">
              WorkSphere is a multi-tenant management 
              system purpose built for manage the Camps/Events for NGOs and Organizations
            </p>

            <p className="text-gray-600 leading-8 text-[0.98rem] mb-8">
              From coordinating emergencies and tracking staff availability
              to assigning tasks and capturing AI powered voice prescriptions,
              our mission is simple give every organization, no matter its
              size, the tools to run their camps efficiently and focus on
              what matters most: the people they serve.
            </p>

            <Link to="/about">
              <Button
                size="large"
                variant="secondary"
                className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Learn More About Us
                <ArrowRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <Heart className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Mission</h3>
              <p className="text-sm text-gray-500 leading-6">
                Empowering NGOs to serve more people with less overhead.
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <Users2 className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Team</h3>
              <p className="text-sm text-gray-500 leading-6">
                A dedicated group building tools for real humanitarian impact.
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <Shield className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Promise</h3>
              <p className="text-sm text-gray-500 leading-6">
                Secure, reliable infrastructure your organization can trust.
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <Sparkles className="text-indigo-600 mb-3" size={28} />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Our Vision</h3>
              <p className="text-sm text-gray-500 leading-6">
                A world where every relief camp runs on one smart system.
              </p>
            </Card>
          </div>

        </div>
      </section>

      <Team />
            {/* ================= PRICING SECTION ================= */}

      <section
        id="pricing"
        className="scroll-mt-24 px-[5%] py-16 md:py-20 border-t border-gray-200 bg-gray-50"
      >
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">

            <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold mb-4 text-gray-900">
              Flexible Subscription Plans
            </h2>

            <p className="text-gray-500 max-w-xl mx-auto text-[0.95rem] leading-7">
              Choose a plan tailored to your NGO size. Upgrade or downgrade
              anytime.
            </p>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Basic Plan */}

            <Card className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col">

              <div>

                <h3 className="text-2xl font-bold text-gray-900">
                  Basic Plan
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Ideal for small local charities
                </p>

              </div>

              <div className="flex items-end gap-2 mt-8">

                <span className="text-4xl font-extrabold text-gray-900">
                  Rs. 10,000
                </span>

                <span className="text-gray-500 mb-2">
                  /month
                </span>

              </div>

              <ul className="mt-8 space-y-4 flex-grow">

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  1 Active Camp
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Up to 15 Staff Members
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Basic Task Management
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Alerts Notification Core
                </li>
                <li className="opacity-0 flex items-center gap-3">
                      <CheckCircle2 size={18} />
               Placeholder
              </li>

              </ul>

                            <Link to="/register-org" className="mt-auto pt-8">
                <Button
                  variant="secondary"
                  fullWidth
                  className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl               hover:scale-105 transition-all duration-300"
               >
                  Select Basic
               </Button>
              </Link>

            </Card>

            {/* Standard Plan */}

            <Card className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col">

              <div>

                <h3 className="text-2xl font-bold text-gray-900">
                  Standard Plan
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  For growing regional NGOs
                </p>

              </div>

              <div className="flex items-end gap-2 mt-8">

                <span className="text-4xl font-extrabold text-gray-900">
                  Rs. 30,000
                </span>

                <span className="text-gray-500 mb-2">
                  /month
                </span>

              </div>

              <ul className="mt-8 space-y-4 flex-grow">

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Up to 5 Active Camps
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Up to 60 Staff Members
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Full Task Management
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Priority Alerts & Support
                </li>
                <li className="opacity-0 flex items-center gap-3">
                      <CheckCircle2 size={18} />
               Placeholder
              </li>

              </ul>

              <Link to="/register-org" className="mt-auto pt-8">
                <Button
                  variant="secondary"
                  fullWidth
                  className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl               hover:scale-105 transition-all duration-300"
               >
                  Select Standard
               </Button>
              </Link>

            </Card>

            {/* Premium Plan */}

            <Card className="relative rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-8 shadow-xl flex flex-col">

              <span className="absolute top-5 right-5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Popular
              </span>

              <div>

                <h3 className="text-2xl font-bold text-gray-900">
                  Premium Plan
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  For active national NGOs
                </p>

              </div>

              <div className="flex items-end gap-2 mt-8">

                <span className="text-4xl font-extrabold text-indigo-600">
                  Rs. 80,000
                </span>

                <span className="text-gray-500 mb-2">
                  /month
                </span>

              </div>

              <ul className="mt-8 space-y-4 flex-grow">

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Unlimited Medical Camps
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Unlimited Users & Roles
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Advanced Task Management
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  AI Audio Notes & Analytics
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Premium 24/7 Support
                </li>

              </ul>

             <Link to="/register-org" className="mt-auto pt-8">
               <Button
                  variant="secondary"
                 fullWidth
                 className="group flex items-center justify-center gap-2 px-8 py-4 font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl              hover:scale-105 transition-all duration-300"
               >
                  Select Premium
                </Button>
              </Link>

            </Card>

          </div>

        </div>

      </section>

    </PublicLayout>
  );
};

export default Home;