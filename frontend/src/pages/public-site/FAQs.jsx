import React, { useMemo, useState } from "react";
import {
  ChevronDown, Search, HelpCircle, User, LogIn, Users2, CalendarDays, Briefcase,
  UsersRound, FileText, ShieldCheck, BarChart3, Cpu, KeyRound, Smartphone,
  Mail, MessageCircle, Clock, LifeBuoy, X, LayoutDashboard,
} from "lucide-react";
import { InfoPage } from "./InfoPage";

/* Content from the WorkSphere FAQs document */
const FAQS = [
  { icon: User, q: "What is WorkSphere?", a: "WorkSphere is a multi-tenant, AI-powered platform built for multi-cloud organizations. It helps you manage your people, operations, projects, events and more — all in one place." },
  { icon: Users2, q: "Who can use WorkSphere?", a: "WorkSphere is designed for NGOs, organizations, companies and teams. Admins, employees, volunteers and members can all use the platform with role-based access." },
  { icon: LogIn, q: "How do I log in to my account?", a: "First, register your organization using your official email. Once approved, you'll get access to your portal. Then, you can log in from the WorkSphere login page." },
  { icon: LayoutDashboard, q: "What happens after login?", a: "After logging in, your organization's Command Center opens. You'll first see the main Dashboard, where you can access all modules, data and features based on your permissions." },
  { icon: UsersRound, q: "How do I add employees or team members?", a: "Go to the Users & Access Management section. Send a registration request for new members. Once approved by the admin, they will get access and you can assign specific roles and permissions." },
  { icon: CalendarDays, q: "How can I create camps or events?", a: "Navigate to the Camps & Events Section. You can create new camps, organize events, post announcements, and share opportunities. All camps and events will be visible in one page for easy management." },
  { icon: Briefcase, q: "How do I manage projects and campaigns?", a: "Go to the Projects & Campaigns module. You can manage your projects, campaigns, meetings and task matrix. You can set timelines (daily, weekly, monthly or yearly) based on your needs." },
  { icon: Users2, q: "Can I track volunteers, donors and partners?", a: "Yes! In the People & Partnership section, you can manage volunteers, donors, sponsors, partners and beneficiaries. You can view counts and details all in one dashboard." },
  { icon: FileText, q: "How do I manage expenses and documents?", a: "Go to the Finance & Documents section. You can list your expenses, upload and manage documents, and also track reports and impact frameworks." },
  { icon: ShieldCheck, q: "How does the approval system work?", a: "Any new document, expense category, user request or partnership request needs approval from the admin. No one gets full access directly — everything is verified and approved first." },
  { icon: BarChart3, q: "Where can I find reports and insights?", a: "Go to the Reports & Insights section. You'll get analytics, fundraising reports, impact management data, and audit/activity logs. You can view data weekly, monthly, yearly or for the last 7 days." },
  { icon: Cpu, q: "What AI features are available?", a: "Use the AI module to dictate a prescription and let AI transcribe it. You also get voice assistance, prescription history and version/group features for team discussions. All access is subject to approval." },
  { icon: KeyRound, q: "Can I change my password?", a: "Yes, you can update your password anytime from the Settings section. If you forget your password, use the reset option or contact support." },
  { icon: Smartphone, q: "Is there a mobile version?", a: "WorkSphere is designed to be accessible on multiple devices. You can use it on desktop, tablet or mobile (optimized experience)." },
].map((f, i) => ({ ...f, n: i + 1 }));

const CONTACT = [
  { icon: Mail, label: "Email", value: "worksphere.thf@gmail.com", href: "mailto:worksphere.thf@gmail.com" },
  { icon: MessageCircle, label: "WhatsApp", value: "+92 371 0137556", href: "https://wa.me/923710137556" },
  { icon: Clock, label: "Support Hours", value: "Mon – Sat | 9AM – PM (PKT)" },
];

export default function FAQs() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(1);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return FAQS;
    return FAQS.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(t));
  }, [query]);

  return (
    <InfoPage
      eyebrow="Help Center"
      title="Frequently asked questions."
      description="Quick answers to your most common questions. If you need more help, our support team is always here for you!"
      icon="faq"
    >
      <main className="relative overflow-hidden bg-gradient-to-b from-[#f4f8ff] via-white to-[#f4f8ff] px-[5%] py-12 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-40 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          {/* Search */}
          <div className="mx-auto mb-3 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={19} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full rounded-2xl border border-blue-100 bg-white/90 py-4 pl-12 pr-12 text-sm text-gray-900 shadow-lg shadow-blue-100/60 outline-none backdrop-blur transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="mb-8 text-center text-xs font-semibold text-gray-400">
            {filtered.length} of {FAQS.length} questions
          </p>

          {/* FAQ grid */}
          <div className="grid items-start gap-4 md:grid-cols-2">
            {filtered.map(({ n, icon: Icon, q, a }) => {
              const isOpen = open === n;
              return (
                <div
                  key={n}
                  className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
                    isOpen
                      ? "border-blue-300 shadow-xl shadow-blue-100/70"
                      : "border-blue-100 shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? -1 : n)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                        isOpen
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200"
                          : "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
                      }`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">Question {String(n).padStart(2, "0")}</span>
                      <span className="mt-0.5 block text-[15px] font-bold leading-snug text-blue-950">{q}</span>
                    </span>
                    <ChevronDown size={19} className={`shrink-0 text-blue-300 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="mx-5 mb-5 rounded-xl border border-blue-50 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4 text-sm leading-7 text-gray-700">
                      {a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!filtered.length && (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center">
              <HelpCircle className="mx-auto mb-3 text-blue-300" size={30} />
              <p className="text-sm text-gray-500">No questions matched your search. Try a different phrase or contact support below.</p>
            </div>
          )}

          {/* Support block */}
          <div className="relative mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1a4a] via-[#0d2a8a] to-blue-700 p-8 text-white shadow-2xl shadow-blue-300/40 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><LifeBuoy size={20} /></span>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200">Still I have questions?</p>
              </div>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">We're Here to Help!</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-blue-100">
                If you didn't find your answer, feel free to contact our support team. We're happy to assist you.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {CONTACT.map(({ icon: Icon, label, value, href }) => {
                  const inner = (
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><Icon size={18} /></span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">{label}</span>
                        <span className="mt-0.5 block break-words text-sm font-semibold text-white">{value}</span>
                      </span>
                    </>
                  );
                  const cls = "flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur transition";
                  return href ? (
                    <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`${cls} hover:-translate-y-0.5 hover:bg-white/20`}>{inner}</a>
                  ) : (
                    <div key={label} className={cls}>{inner}</div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </InfoPage>
  );
}