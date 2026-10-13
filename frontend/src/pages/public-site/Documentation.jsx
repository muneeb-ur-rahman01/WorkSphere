import React, { useEffect, useState } from "react";
import {
  BookOpen, ChevronRight, ClipboardCheck, LayoutDashboard, Users2, BarChart3, Settings2,
  ShieldCheck, ArrowRight, Cpu, FolderKanban, DollarSign, FileText, Megaphone,
  MessagesSquare, Workflow, Rocket, LifeBuoy, CheckCircle2, Sparkles, Info, Lock,
  LayoutTemplate, CalendarDays, Zap, Clock, Database, LineChart, PieChart, KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { InfoPage, LinkCard } from "./InfoPage";

/* ------------------------------------------------------------------ */
/*  CONTENT (from WorkSphere Product Documentation & User Workflow Guide) */
/* ------------------------------------------------------------------ */

const intro = {
  heading: "Introduction to WorkSphere",
  text: "WorkSphere is a state-of-the-art SaaS platform designed to revolutionize how organizations manage their operations across multi-tenant and multi-cloud environments. Our vision is to empower organizations with intelligent tools that streamline workflows, enhance collaboration, and provide actionable insights for sustainable growth.",
  overviewTitle: "Product Overview",
  overview:
    "WorkSphere offers a unified workspace experience, integrating cutting-edge features such as AI-powered workflow automation, intelligent voice assistance, 24/7 operational insights, centralized data management, real-time analytics, automated reporting, and dynamic visualization.",
};

const keyFeatures = [
  { icon: Zap, title: "AI-Powered Workflow Automation", text: "Automate repetitive tasks and optimize operational efficiency." },
  { icon: Sparkles, title: "Intelligent Voice Assistance", text: "Interact with WorkSphere using natural language commands." },
  { icon: Clock, title: "24/7 Operational Insights", text: "Monitor your organization's performance around the clock." },
  { icon: Database, title: "Centralized Data Management", text: "Securely store and access all your organizational data in one place." },
  { icon: LineChart, title: "Real-Time Analytics & Reporting", text: "Gain immediate insights into key performance indicators." },
  { icon: PieChart, title: "Automated Reports & Visualization", text: "Generate comprehensive reports and intuitive visual dashboards." },
];

const journey = [
  ["Open WorkSphere Portal", "Navigate to the WorkSphere web address."],
  ["Register/Create Organization", "Initiate the setup process by registering your organization."],
  ["Receive Access", "Confirmation and access details will be sent to your registered email."],
  ["Connect People and Operations", "Onboard your team and integrate existing operational data."],
  ["Organization Command Center/Dashboard", "Access your personalized dashboard for comprehensive management."],
];

const modules = [
  ["Events", "Track and manage all upcoming and past organizational events.", "View event schedules, RSVPs, and attendance."],
  ["Active Processes", "Monitor ongoing workflows and operations.", "Track progress, identify bottlenecks, and manage resource allocation."],
  ["Pending Waitlist", "Manage queues for limited resources or opportunities.", "View and manage individuals or items on waitlists."],
  ["Upcoming Camps/Events", "Specific module for managing camp and event registrations.", "Facilitate sign-ups, manage logistics, and track participation."],
  ["Tasks", "Assign, track, and manage individual and team tasks.", "Set deadlines, priorities, and track completion status."],
  ["Meetings", "Schedule, organize, and manage all organizational meetings.", "View calendars, invite participants, and track meeting outcomes."],
  ["Birthdays", "Track and celebrate team member birthdays.", "Generate reminders and acknowledge special occasions."],
  ["Projects", "Oversee project lifecycles from initiation to completion.", "Manage timelines, budgets, resources, and deliverables."],
  ["Campaigns", "Plan, execute, and monitor marketing or fundraising campaigns.", "Track campaign performance, engagement, and ROI."],
  ["Volunteers", "Manage volunteer information, assignments, and engagement.", "Track hours, roles, and contributions."],
  ["Donors", "Manage donor relationships and contribution history.", "Track donations, generate thank-you notes, and segment donor groups."],
  ["Sponsors", "Manage relationships with organizational sponsors.", "Track sponsorship agreements, contributions, and benefits."],
  ["Partners", "Oversee relationships with strategic partners.", "Manage agreements, collaborations, and mutual benefits."],
  ["Expenses", "Track and manage organizational expenditures.", "Submit, approve, and categorize expenses."],
  ["Beneficiaries", "Manage information and engagement with beneficiaries.", "Track support provided and impact on beneficiaries."],
  ["Documents", "Centralized repository for all organizational documents.", "Upload, organize, search, and manage document versions."],
  ["Favorites", "Quick access to frequently used modules or documents.", "Personalize your dashboard for efficiency."],
];

const templateFields = [
  ["Purpose", "Clearly define the objective of the feature."],
  ["Roles", "Specify the user roles involved."],
  ["Steps", "Outline the sequential actions required."],
  ["Inputs", "Detail the information or data needed."],
  ["Outputs", "Describe the expected results or deliverables."],
  ["Approvals", "Define the approval workflow, if applicable."],
  ["Permissions", "Set access controls for users interacting with the feature."],
  ["Outcomes", "State the intended impact or benefit of using the feature."],
];

/* type: "journey" | "modules" | "items" | "templates" | "steps" */
const sections = [
  {
    n: "01", icon: Rocket, title: "Getting started & User Journey", type: "journey",
    text: "Follow this streamlined process to get your organization set up and running on WorkSphere.",
  },
  {
    n: "02", icon: LayoutDashboard, title: "Dashboard modules overview", type: "modules",
    text: "The WorkSphere dashboard provides a centralized hub for managing all aspects of your organization. Below is a detailed description of each module.",
  },
  {
    n: "03", icon: Users2, title: "User & access management", type: "items",
    text: "WorkSphere ensures robust control over user access and permissions to maintain security and operational integrity.",
    items: [
      ["Registration Requests", "New users can request access to the platform."],
      ["Admin Approval", "Designated administrators review and approve or deny registration requests."],
      ["Staff Onboarding", "Streamlined process for integrating new employees into WorkSphere."],
      ["Role-Based Permissions", "Assign specific roles to users, granting access only to relevant modules and data."],
      ["Limited Access for Volunteers/Members", "Configure specific permission sets for external or less integrated user groups."],
    ],
    callout: ["Confirmation Required", "Ensure all user roles and permissions are meticulously defined and reviewed before granting access.", "warn"],
  },
  {
    n: "04", icon: Megaphone, title: "Camps/Events, Announcements, Opportunities & Visibility", type: "items",
    text: "Organize events, broadcast updates, and keep everyone aligned.",
    items: [
      ["Camps/Events Management", "Dedicated tools for organizing and managing all types of camps and events, including registration, scheduling, and resource allocation."],
      ["Announcements", "A centralized feed for broadcasting important organizational news and updates to all users."],
      ["Opportunities", "A module to post and manage available opportunities, such as job openings, volunteer roles, or special projects."],
      ["One-Page Visibility", "A consolidated view offering a high-level overview of key organizational activities and metrics."],
    ],
  },
  {
    n: "05", icon: FolderKanban, title: "Projects, campaigns, meetings & task matrix", type: "items",
    text: "WorkSphere provides integrated tools for effective project and campaign management.",
    items: [
      ["Projects", "Plan, execute, and track project timelines, milestones, and resource allocation."],
      ["Campaigns", "Design, launch, and monitor the performance of various campaigns, from marketing to fundraising."],
      ["Meetings", "Schedule, conduct, and document all organizational meetings."],
      ["Task Matrix", "A visual representation of tasks, their assignments, deadlines, and dependencies, facilitating efficient workload management."],
    ],
  },
  {
    n: "06", icon: Users2, title: "People & partnerships", type: "items",
    text: "Manage all key stakeholder relationships within WorkSphere.",
    items: [
      ["Volunteers", "Track volunteer profiles, hours, skills, and contributions."],
      ["Donors", "Maintain a comprehensive database of donors, their giving history, and engagement."],
      ["Sponsors", "Manage sponsor agreements, benefits, and communication."],
      ["Partners", "Nurture relationships with strategic partners and manage collaborative projects."],
      ["Beneficiaries", "Keep detailed records of individuals or groups receiving support from the organization."],
    ],
  },
  {
    n: "07", icon: DollarSign, title: "Finance & documents", type: "items",
    text: "Oversee financial operations and document management with WorkSphere's robust features.",
    items: [
      ["Expenses", "Submit, track, and approve all organizational expenses."],
      ["Reports", "Generate financial reports, including P&L statements, balance sheets, and budget vs. actuals."],
      ["Impact Frameworks", "Define and track key metrics to measure the social or organizational impact of your initiatives."],
    ],
  },
  {
    n: "08", icon: ClipboardCheck, title: "Approval system", type: "items",
    text: "WorkSphere incorporates a multi-level approval system for critical organizational processes.",
    items: [
      ["Documents", "Ensure all important documents are reviewed and approved before distribution."],
      ["Expenses", "Implement financial controls with an expense approval workflow."],
      ["Users", "Administrator approval for new user registrations and role changes."],
      ["Partnerships", "Formalize collaborations through a structured partnership approval process."],
    ],
  },
  {
    n: "09", icon: BarChart3, title: "Reports, insights & governance", type: "items",
    text: "Gain deep insights into your organization's performance with WorkSphere's comprehensive reporting and analytics.",
    items: [
      ["Analytics/Reports", "Access a wide array of pre-built and customizable reports on various organizational aspects."],
      ["Fundraising", "Track fundraising performance, campaign success, and donor engagement."],
      ["Impact Management", "Measure and report on the tangible impact of your programs and initiatives."],
      ["Audit/Activity Logs", "Maintain a detailed record of all user actions for accountability and security."],
    ],
    callout: ["Log Structure", "When  •  Actor  •  Action  •  Entity  •  Change", "info"],
  },
  {
    n: "10", icon: Cpu, title: "AI module & intelligent assistance", type: "items",
    text: "Leverage the power of Artificial Intelligence within WorkSphere.",
    items: [
      ["Dictate a Prescription", "Use voice commands to input information or create documents."],
      ["Automatic Transcription and Structuring", "AI transcribes voice inputs and structures them into relevant formats (e.g., meeting minutes, task lists)."],
      ["Prescription History", "Access a searchable history of all AI-generated inputs and documents."],
      ["AI Prompt Library", "A curated collection of effective prompts for various organizational tasks."],
    ],
  },
  {
    n: "11", icon: MessagesSquare, title: "Groups & channels for team discussions", type: "items",
    text: "Facilitate seamless team communication and collaboration through WorkSphere's integrated groups and channels.",
    items: [
      ["Create Groups/Channels", "Set up dedicated spaces for specific teams, projects, or topics."],
      ["Team Discussions", "Engage in real-time conversations, share files, and collaborate effectively."],
      ["Approval for Groups/Channels", "Administrators can manage the creation and moderation of discussion groups."],
    ],
  },
  {
    n: "12", icon: Settings2, title: "Settings & account management", type: "items",
    text: "Manage your WorkSphere account and organizational settings.",
    items: [
      ["Settings", "Configure organizational preferences, branding, and system-wide settings."],
      ["Password Reset/Change", "Securely manage your account password."],
    ],
  },
  {
    n: "13", icon: LayoutTemplate, title: "Feature templates", type: "templates",
    text: "WorkSphere provides pre-defined templates to standardize common organizational processes.",
    callout: ["Confirmation Required", "Review and customize templates to fit your organization's specific needs.", "warn"],
  },
  {
    n: "14", icon: Workflow, title: "Flowcharts & workflow visualizations", type: "items",
    text: "Visualize complex processes with WorkSphere's integrated flowchart and workflow tools.",
    items: [
      ["Text Flowcharts", "Create simple flowcharts using text-based descriptions."],
      ["Numbered Workflows", "Clearly delineate steps in a process with numbered sequences."],
      ["Visual Workflow Layouts", "Design and implement graphical representations of operational workflows."],
    ],
  },
  {
    n: "15", icon: ShieldCheck, title: "Policies, security & governance", type: "items",
    text: "WorkSphere is built with security and compliance at its core.",
    items: [
      ["Policies", "Access and manage organizational policies related to data usage, security, and operations."],
      ["Security", "Implement robust security measures to protect your organizational data."],
      ["Governance", "Ensure compliance with industry regulations and best practices."],
    ],
    callout: ["Data Protection", "All data within WorkSphere is encrypted at rest and in transit. Please refer to the Security Policy document for detailed information.", "lock"],
  },
  {
    n: "16", icon: LifeBuoy, title: "Onboarding & support", type: "items",
    text: "Everything you need to get fully operational and stay supported.",
    items: [
      ["Onboarding Checklist", "A step-by-step guide to help new users and organizations get fully operational on WorkSphere."],
      ["FAQ", "Frequently Asked Questions to address common user queries."],
      ["Glossary", "Definitions of key terms and concepts used within WorkSphere."],
      ["Roadmap", "Insights into future developments and planned features for WorkSphere."],
      ["Document Control", "Version history and management for all documentation related to WorkSphere."],
    ],
    callout: ["Confirmation Required", "Ensure the onboarding checklist is regularly updated to reflect the latest features.", "warn"],
  },
  {
    n: "17", icon: CheckCircle2, title: "Summary & next steps", type: "steps",
    text: "This document provides a comprehensive overview of WorkSphere's features, user journey, and operational capabilities. We encourage you to explore each module and leverage the platform's power to enhance your organization's efficiency and effectiveness.",
    steps: [
      ["Begin your organization's setup", "Follow the User Journey outlined above."],
      ["Explore the Dashboard Modules", "Familiarize yourself with WorkSphere's functionalities."],
      ["Review User and Access Management", "Establish appropriate permissions."],
      ["Use Feature Templates and Workflow Visualizations", "Standardize and optimize your processes."],
      ["Consult Policies, Security, and Governance", "Ensure compliance."],
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  SMALL UI PIECES                                                     */
/* ------------------------------------------------------------------ */

const calloutStyles = {
  warn: { box: "border-amber-200 bg-amber-50", icon: "text-amber-600 bg-white", title: "text-amber-900", text: "text-amber-800", Icon: Info },
  info: { box: "border-sky-200 bg-sky-50", icon: "text-sky-600 bg-white", title: "text-sky-900", text: "text-sky-800", Icon: FileText },
  lock: { box: "border-emerald-200 bg-emerald-50", icon: "text-emerald-600 bg-white", title: "text-emerald-900", text: "text-emerald-800", Icon: Lock },
};

function Callout({ data }) {
  const [title, text, kind] = data;
  const s = calloutStyles[kind] || calloutStyles.info;
  const Icon = s.Icon;
  return (
    <div className={`mt-6 flex gap-3 rounded-2xl border p-4 ${s.box}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${s.icon}`}><Icon size={17} /></div>
      <div>
        <p className={`text-sm font-bold ${s.title}`}>{title}</p>
        <p className={`mt-0.5 text-sm leading-6 ${s.text}`}>{text}</p>
      </div>
    </div>
  );
}

function ItemCard({ title, text }) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-100/50">
      <div className="flex items-start gap-2.5">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-indigo-500" />
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-[13px] leading-6 text-gray-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

function SectionBody({ s }) {
  if (s.type === "journey") {
    return (
      <ol className="relative mt-6 space-y-4 border-l-2 border-dashed border-indigo-100 pl-6">
        {journey.map(([t, d], i) => (
          <li key={t} className="relative">
            <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-black text-white shadow-md shadow-indigo-200 ring-4 ring-white">
              {i + 1}
            </span>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-100/50">
              <h3 className="text-sm font-bold text-gray-900">{t}</h3>
              <p className="mt-1 text-[13px] leading-6 text-gray-600">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  if (s.type === "modules") {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {modules.map(([name, purpose, details]) => (
          <div key={name} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-100/50">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <span className="h-2 w-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500" />
              {name}
            </h3>
            <p className="mt-2 text-[13px] leading-6 text-gray-700"><span className="font-bold text-indigo-600">Purpose: </span>{purpose}</p>
            <p className="mt-1 text-[13px] leading-6 text-gray-600"><span className="font-bold text-indigo-600">Details: </span>{details}</p>
          </div>
        ))}
      </div>
    );
  }

  if (s.type === "templates") {
    return (
      <>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {templateFields.map(([t, d]) => <ItemCard key={t} title={t} text={d} />)}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><FileText size={17} /></div>
          <p className="text-sm font-semibold text-gray-800"><span className="text-indigo-600">Example Template:</span> Expense Reimbursement Request</p>
        </div>
      </>
    );
  }

  if (s.type === "steps") {
    return (
      <ol className="mt-6 space-y-3">
        {s.steps.map(([t, d], i) => (
          <li key={t} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-100/50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white shadow-md shadow-indigo-200">{i + 1}</span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{t}</h3>
              <p className="mt-0.5 text-[13px] leading-6 text-gray-600">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {s.items.map(([t, d]) => <ItemCard key={t} title={t} text={d} />)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function Documentation() {
  const [active, setActive] = useState("doc-01");

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`doc-${s.n}`)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <InfoPage
      eyebrow="WorkSphere Documentation"
      title="A practical guide to running your organization in one workspace."
      description="Learn how WorkSphere organizes people, responsibilities, operational records, communication, analytics, and administrative controls. This documentation is written for organization administrators and staff members."
      icon="docs"
    >
      <main className="relative overflow-hidden bg-gradient-to-b from-white via-gray-50/60 to-white px-[5%] py-12 sm:py-16">
        {/* soft background glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[250px_1fr]">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-gray-200/80 bg-white/80 p-3 shadow-lg shadow-gray-200/40 backdrop-blur">
              <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">On this page</p>
              <nav className="space-y-0.5">
                {sections.map((s) => {
                  const on = active === `doc-${s.n}`;
                  return (
                    <a
                      key={s.n}
                      href={`#doc-${s.n}`}
                      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold leading-5 transition ${
                        on ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50 hover:text-indigo-600"
                      }`}
                    >
                      <span className={`mt-0.5 text-[10px] font-black ${on ? "text-indigo-500" : "text-gray-300"}`}>{s.n}</span>
                      <span>{s.title}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* CONTENT */}
          <div className="space-y-6">
            {/* Intro card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-7 text-white shadow-xl shadow-indigo-200 sm:p-9">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-2xl" />
              <div className="relative flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur"><BookOpen size={22} /></div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">{intro.heading}</h2>
                  <p className="mt-2 text-sm leading-7 text-indigo-50">{intro.text}</p>
                  <h3 className="mt-5 text-base font-bold">{intro.overviewTitle}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-indigo-50">{intro.overview}</p>
                </div>
              </div>
            </div>

            {/* Key features */}
            <div>
              <p className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Key Features</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {keyFeatures.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-indigo-100"><Icon size={18} /></div>
                    <h3 className="mt-3 text-sm font-bold text-gray-900">{title}</h3>
                    <p className="mt-1 text-[13px] leading-6 text-gray-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sections */}
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <section
                  id={`doc-${s.n}`}
                  key={s.n}
                  className="scroll-mt-28 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg hover:shadow-gray-200/60 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200"><Icon size={21} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-black tracking-wider text-indigo-600">{s.n}</span>
                        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">{s.title}</h2>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-gray-600">{s.text}</p>
                    </div>
                  </div>
                  <SectionBody s={s} />
                  {s.callout && <Callout data={s.callout} />}
                </section>
              );
            })}

            {/* Link cards */}
            <div className="grid gap-4 pt-2 md:grid-cols-2">
              <LinkCard to="/security" icon={ShieldCheck} title="Policies, Security & Governance" text="Review end-to-end data encryption protocols, compliance guidelines, and system security documentation." />
              <LinkCard to="/help-support" icon={ClipboardCheck} title="Onboarding & Support" text="Explore step-by-step checklists, helpful FAQs, workspace glossaries, and direct support contacts." />
            </div>
          </div>
        </div>
      </main>
    </InfoPage>
  );
}