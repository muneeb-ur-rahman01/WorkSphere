import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users2,
  BarChart3,
  Bell,
  CheckCircle2,
  Search,
} from 'lucide-react';
import video from '../../assets/videos/background.mp4';

const stats = [
  { title: 'Multi-Tenant', text: 'Built for Multiple Organizations' },
  { title: 'AI-Powered', text: 'Intelligent Voice & Workflow Automation' },
  { title: '24/7', text: 'Operational Access' },
  { title: '100%', text: 'Centralized Data' },
  { title: 'Real-Time', text: 'Analytics & Insights' },
  { title: 'Automated', text: 'Reports & Visualizations' },
];

const sidebar = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: ClipboardList, label: 'Tasks' },
  { icon: CalendarDays, label: 'Events' },
  { icon: Users2, label: 'Teams' },
  { icon: BarChart3, label: 'Reports' },
  { icon: Bell, label: 'Notifications' },
];

const bars = [40, 65, 50, 80, 60, 90, 70];

const DashboardMockup = () => (
  <div className="relative">
    {/* Floating notification (top right) */}
    <div className="absolute -top-8 right-0 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 shadow-xl backdrop-blur-md">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span>
        <b className="text-white">Task assigned</b> to Ayesha automatically.
      </span>
    </div>

    {/* Window */}
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-40 shrink-0 border-r border-white/10 p-3">
          <p className="mb-3 px-2 text-sm font-bold text-indigo-400">WorkSphere</p>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-slate-500">
            <Search size={11} /> Search...
          </div>
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            General
          </p>
          <ul className="space-y-1">
            {sidebar.map(({ icon: Icon, label, active }) => (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium ${
                  active
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-400'
                }`}
              >
                <Icon size={13} />
                {label}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <div className="flex-1 space-y-3 p-4">
          {/* Mini stat tiles */}
          <div className="grid grid-cols-4 gap-2">
            {[
              ['24', 'Active tasks'],
              ['8', 'Events'],
              ['62', 'Members'],
              ['97%', 'On time'],
            ].map(([n, l]) => (
              <div
                key={l}
                className="rounded-lg border border-white/10 bg-white/5 p-2.5"
              >
                <p className="text-sm font-bold text-white">{n}</p>
                <p className="text-[9px] text-slate-400">{l}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Activity */}
            <div className="col-span-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-[11px] font-bold text-white">
                Today&apos;s team activity
              </p>
              {[
                'Weekly report generated',
                'Event schedule updated',
                'Voice note converted to task',
              ].map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-2 py-1.5 text-[10px] text-slate-300"
                >
                  <CheckCircle2 size={12} className="text-indigo-400" />
                  {t}
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-[11px] font-bold text-white">This week</p>
              <div className="flex h-20 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t bg-gradient-to-t from-indigo-600 to-purple-400"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Floating card (bottom left) */}
    <div className="absolute -bottom-8 -left-10 z-20 w-64 rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/40 text-indigo-300">
            <CheckCircle2 size={14} />
          </span>
          <span className="text-sm font-bold text-white">Annual Report</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">Syncing...</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
      </div>
    </div>
  </div>
);

const HeroSection = () => (
  <section className="relative min-h-[720px] overflow-hidden px-[5%] pt-16 pb-14 sm:pt-20 md:pt-24 lg:pt-[100px] lg:pb-20">
    {/* Background Video */}
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src={video} type="video/mp4" />
      Your browser does not support the video tag.
    </video>

    {/* Dark overlay (reference jaisa dark look) */}
    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-indigo-950/60" />

    <div className="relative z-10 mx-auto max-w-7xl">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* ---------- LEFT: content ---------- */}
        <div className="text-left">
          {/* Badge */}
          <div className="animate-slide-up mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            One Platform. Every Team. Every Operation
          </div>

          <h1 className="animate-slide-up font-[var(--font-title)] text-[2.4rem] font-extrabold leading-[1.1] text-white sm:text-[3rem] md:text-[3.6rem] lg:text-[4rem]">
            The Ultimate
            <br />
            Management
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
              Operating System.
            </span>
          </h1>

          <p className="animate-slide-up mt-8 max-w-xl font-[var(--font-body)] text-base leading-8 text-slate-300 sm:text-lg">
            A universal management platform that enables organizations to
            coordinate teams, manage operations, assign tasks, track resources,
            and stay connected, powered by AI voice capture, intelligent
            analytics, workflow automation, and real-time data visualization.
          </p>

          {/* CTA */}
          <div className="animate-slide-up mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link to="/register-org">
              <button
                type="button"
                className="group flex items-center gap-2 rounded-full border border-indigo-400/30 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-950/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                Register Your Workspace
                <ArrowRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </Link>

            <Link to="/login/org">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white hover:text-gray-900"
              >
                <Play size={20} className="text-indigo-300" />
                Enter Workspace
              </button>
            </Link>
          </div>
        </div>

        {/* ---------- RIGHT: dashboard mockup ---------- */}
        <div className="animate-slide-up hidden pb-8 lg:block">
          <DashboardMockup />
        </div>
      </div>

      {/* ---------- Stats strip ---------- */}
      <div className="mt-20 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
          >
            <h3 className="text-lg font-bold text-white">{s.title}</h3>
            <p className="mt-1 text-xs font-medium text-slate-300">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;