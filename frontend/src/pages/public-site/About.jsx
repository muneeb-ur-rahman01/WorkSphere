import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Shield,
  Sparkles,
  Mic,
  BarChart3,
  Users2,
  Zap,
  Target,
  Globe2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Card from '../../shared/Card/Card';
import Team from './Team';

const About = () => {
  return (
    <PublicLayout>

      {/* ================= HERO ================= */}

      <section className="relative overflow-hidden bg-white px-[5%] pt-16 pb-14 sm:pt-20 md:pt-24 lg:pt-[100px] lg:pb-20">
        <div className="mx-auto max-w-4xl text-center">

          {/* <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 mb-8">
            <Heart size={16} />
            About WorkSphere
          </div> */}

          <h1 className="font-[var(--font-title)] text-[2rem] sm:text-[2.6rem] md:text-[3rem] font-extrabold leading-[1.15] text-gray-900 max-w-3xl mx-auto mb-6">
           Multi-Tenant Workforce & Operations Management Platform
          </h1>

          <p className="font-[var(--font-body)] text-base sm:text-[1.05rem] md:text-[1.15rem] text-gray-600 max-w-2xl mx-auto leading-8">
           WorkSphere is a scalable, multi-tenant workforce and operations management platform designed to help organizations manage people, tasks, events, communication and day-to-day operations through a secure digital environment.
          </p>

        </div>
      </section>

      {/* ================= OUR STORY ================= */}

      <section className="px-[5%] py-16 md:py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          <div>
            <h2 className="text-[1.6rem] sm:text-[1.9rem] font-bold text-gray-900 mb-5">
              Our Story
            </h2>

            <p className="text-gray-600 leading-8 text-[0.98rem] mb-4">
              WorkSphere started with a simple observation: medical NGOs run
              on volunteers, urgency, and goodwill — but far too often, their
              tools are stuck in the past. Camp coordinators were juggling
              WhatsApp groups, printed attendance sheets, and handwritten
              prescriptions, all while trying to respond to emergencies in
              real time.
            </p>

            <p className="text-gray-600 leading-8 text-[0.98rem]">
              We set out to build a single, secure platform where every
              organization — big or small — gets its own private workspace
              to manage camps, staff, tasks, and patient care, all backed by
              modern, reliable technology.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
              <h3 className="text-3xl font-bold text-indigo-600">500+</h3>
              <p className="mt-2 text-sm text-gray-500">Medical Camps</p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
              <h3 className="text-3xl font-bold text-indigo-600">10K+</h3>
              <p className="mt-2 text-sm text-gray-500">Volunteers</p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
              <h3 className="text-3xl font-bold text-indigo-600">99.9%</h3>
              <p className="mt-2 text-sm text-gray-500">Uptime</p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
              <h3 className="text-3xl font-bold text-indigo-600">24/7</h3>
              <p className="mt-2 text-sm text-gray-500">Support</p>
            </Card>
          </div>

        </div>
      </section>

      {/* ================= MISSION / VISION / VALUES ================= */}

      <section className="px-[5%] py-16 md:py-20 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-4">
              What Drives Us
            </h2>
            <p className="max-w-xl mx-auto text-gray-500 text-[0.95rem] leading-7">
              The principles that shape every feature we build.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <Card className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                <Target className="text-indigo-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-gray-500 leading-7 text-[0.92rem]">
                To give every medical NGO, regardless of size or budget, the
                tools to coordinate emergencies, manage staff, and deliver
                care efficiently.
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                <Globe2 className="text-indigo-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Vision</h3>
              <p className="text-gray-500 leading-7 text-[0.92rem]">
                A world where no relief camp is held back by disorganized
                records — where every organization runs on one connected,
                dependable system.
              </p>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                <Shield className="text-indigo-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Promise</h3>
              <p className="text-gray-500 leading-7 text-[0.92rem]">
                Bank-grade, multi-tenant security where every organization's
                data stays private, isolated, and protected.
              </p>
            </Card>

          </div>
        </div>
      </section>

      {/* ================= WHAT WE OFFER ================= */}

      <section className="px-[5%] py-16 md:py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-4">
              What WorkSphere Offers
            </h2>
            <p className="max-w-xl mx-auto text-gray-500 text-[0.95rem] leading-7">
              Everything your organization needs, in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {[
              {
                icon: <Shield className="text-indigo-600" size={22} />,
                title: "Multi-Tenant SaaS Security",
                description:
                  "Each NGO gets its own isolated, secure workspace — your data is never mixed with anyone else's.",
              },
              {
                icon: <Users2 className="text-indigo-600" size={22} />,
                title: "Role-Based Workspace Matrix",
                description:
                  "Dedicated access levels for Admins, Employees, Interns, and Volunteers, so everyone sees exactly what they need.",
              },
              {
                icon: <Zap className="text-indigo-600" size={22} />,
                title: "Broadcast & Availability Alerts",
                description:
                  "Send instant alerts to staff and collect availability with a single click — no more manual calling.",
              },
              {
                icon: <Sparkles className="text-indigo-600" size={22} />,
                title: "Dynamic Task Progression",
                description:
                  "Assign, track, and update tasks live, from Pending to Completed, across the whole team.",
              },
              {
                icon: <Mic className="text-indigo-600" size={22} />,
                title: "AI Voice Prescription",
                description:
                  "Doctors dictate notes and our AI converts them instantly into structured, searchable prescriptions.",
              },
              {
                icon: <BarChart3 className="text-indigo-600" size={22} />,
                title: "Analytics & Reports",
                description:
                  "Track camp performance, volunteer engagement, and outcomes with exportable, real-time reports.",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-4"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 leading-6 text-[0.9rem]">
                    {item.description}
                  </p>
                </div>
              </Card>
            ))}

          </div>
        </div>
      </section>

      {/* ================= WHO WE SERVE ================= */}

      <section className="px-[5%] py-16 md:py-20 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-6">
            Who We Serve
          </h2>

          <p className="text-gray-600 leading-8 text-[0.98rem] mb-8 max-w-2xl mx-auto">
            WorkSphere is built for humanitarian and healthcare
            organizations of every size — from small local charities running
            a single camp, to national NGOs coordinating dozens of teams
            across regions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              "Medical NGOs",
              "Relief Charities",
              "Free Clinics",
              "Volunteer Networks",
              "Disaster Response Teams",
            ].map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700"
              >
                <CheckCircle2 size={14} className="text-indigo-600" />
                {tag}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* ================= TEAM ================= */}

      <Team />

      {/* ================= CTA ================= */}

      <section className="px-[5%] py-16 md:py-20 border-t border-gray-200 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">

          <h2 className="text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] font-bold text-gray-900 mb-4">
            Ready To Bring Your NGO Onboard?
          </h2>

          <p className="text-gray-500 max-w-xl mx-auto text-[0.95rem] leading-7 mb-8">
            Join the organizations already running their camps on
            WorkSphere.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
                className="group flex items-center justify-center px-8 py-4 font-bold text-lg rounded-xl border-2 border-primary hover:bg-primary shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Enter Workspace
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </PublicLayout>
  );
};

export default About;
