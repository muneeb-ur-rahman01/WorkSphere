
import React from "react";
import { BookOpen, ChevronRight, ClipboardCheck, LayoutDashboard, Users2, BarChart3, Settings2, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { InfoPage, LinkCard } from "./InfoPage";

const sections = [
  ["01", "Getting started", "Create an organization, configure the workspace, and understand the first steps."],
  ["02", "People & roles", "Invite personnel, assign roles, and use Accessibility to control additional staff access."],
  ["03", "Operations", "Work with tasks, projects, campaigns, events, camps, meetings, documents, and expenses."],
  ["04", "Resources & relationships", "Manage donors, volunteers, sponsors, partners, beneficiaries, and organization connections."],
  ["05", "Analytics & reporting", "Use dashboards, analytics, impact views, audit logs, and operational reporting."],
  ["06", "Account & billing", "Manage your profile, settings, subscriptions, and supported payment workflows."],
];

export default function Documentation() {
  return (
    <InfoPage
      eyebrow="WorkSphere Documentation"
      title="A practical guide to running your organization in one workspace."
      description="Learn how WorkSphere organizes people, responsibilities, operational records, communication, analytics, and administrative controls. This documentation is written for organization administrators and staff members."
      icon="docs"
    >
      <main className="bg-white px-[5%] py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">On this page</p>
              <nav className="space-y-1">
                {sections.map(([n, title]) => (
                  <a key={n} href={`#doc-${n}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-indigo-600">
                    <span className="text-[10px] font-black text-indigo-400">{n}</span>{title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:p-7">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><BookOpen size={21}/></div>
                <div>
                  <h2 className="font-bold text-gray-900">Start with the workspace basics</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">WorkSphere is built around a simple idea: people, work, information, and insight should remain connected.</p>
                </div>
              </div>
            </div>

            {sections.map(([n, title, text], index) => {
              const icons = [LayoutDashboard, Users2, ClipboardCheck, Users2, BarChart3, Settings2];
              const Icon = icons[index];
              return (
                <section id={`doc-${n}`} key={n} className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={20}/></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black tracking-widest text-indigo-500">{n}</span>
                        <h2 className="text-xl font-extrabold text-gray-900">{title}</h2>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-gray-600">{text}</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {(
                          index === 0 ? ["Register your organization", "Choose and configure your workspace", "Understand the dashboard", "Complete your profile"] :
                          index === 1 ? ["Add users and personnel", "Understand role-based access", "Use Accessibility permissions", "Review pending requests"] :
                          index === 2 ? ["Create and assign tasks", "Plan projects and campaigns", "Manage camps, events and meetings", "Store documents and expenses"] :
                          index === 3 ? ["Maintain donor records", "Coordinate volunteers", "Manage sponsors and partners", "Track beneficiaries and connections"] :
                          index === 4 ? ["Read organization analytics", "Review impact metrics", "Use audit logs", "Turn operational data into decisions"] :
                          ["Update account settings", "Review subscription details", "Use supported billing flows", "Protect account access"]
                        ).map((item) => (
                          <div key={item} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm font-semibold text-gray-700">
                            <ChevronRight size={15} className="text-indigo-500"/>{item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

            <div className="grid gap-4 pt-3 md:grid-cols-2">
              <LinkCard to="/security" icon={ShieldCheck} title="Client-side security guide" text="Practical steps users can take to protect their WorkSphere account and information." />
              <LinkCard to="/help-support" icon={ClipboardCheck} title="Need help?" text="Find support options, troubleshooting guidance, and a direct way to contact the team." />
            </div>
          </div>
        </div>
      </main>
    </InfoPage>
  );
}
