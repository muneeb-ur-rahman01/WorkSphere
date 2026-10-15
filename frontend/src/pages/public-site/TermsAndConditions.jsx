import React, { useEffect, useState } from "react";
import {
  FileText, BookOpen, Layers, UserCheck, Lock, Database, Shield, Ban, Settings,
  CreditCard, Plug, Activity, Copyright, EyeOff, PowerOff, AlertTriangle, Scale,
  ShieldAlert, RefreshCw, Gavel, ListChecks, Mail, CheckCircle2, XCircle,
  ArrowUp, ChevronRight, ClipboardCheck, Users,
} from "lucide-react";
import { InfoPage } from "./InfoPage";

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/*  Block types: p | list | defs | kv | note | contact                 */
/* ------------------------------------------------------------------ */
const SECTIONS = [
  {
    id: "agreement", title: "Agreement and Acceptance", icon: FileText,
    blocks: [
      { t: "p", text: "These Terms and Conditions (“Terms”) govern access to and use of WorkSphere, including its web application, related interfaces, modules, and associated services (collectively, the “Platform”)." },
      { t: "p", text: "By creating an account, accepting an invitation, accessing a workspace, or using the Platform, you agree to these Terms. If you do not agree, you must not use the Platform." },
      { t: "p", text: "If you use WorkSphere on behalf of a company, nonprofit, institution, or other organisation (“Customer”), you represent that you are authorised to act on its behalf. The Customer is bound by these Terms for its use of the Platform." },
    ],
  },
  {
    id: "definitions", title: "Definitions", icon: BookOpen,
    blocks: [
      {
        t: "defs",
        items: [
          ["Provider", "The individual or legal entity identified in the service or account details as responsible for providing WorkSphere."],
          ["Customer", "The organisation or individual that obtains access to WorkSphere."],
          ["Authorised User", "An employee, intern, contractor, volunteer, consultant, or other person whom a Customer permits to access its workspace."],
          ["Workspace", "The Customer’s designated area of the Platform and its related settings, records, users, and permissions."],
          ["Customer Data", "Information, files, records, and content entered into, uploaded to, or generated in the Platform on behalf of a Customer."],
          ["Services", "The Platform and any associated hosting, configuration, implementation, support, or other services agreed in writing."],
        ],
      },
    ],
  },
  {
    id: "scope", title: "WorkSphere and Service Scope", icon: Layers,
    blocks: [
      { t: "p", text: "WorkSphere is an integrated organisational management portal intended to support operational coordination, record management, internal workflows, and reporting. Depending on the Customer’s plan and configuration, available modules may include:" },
      {
        t: "list", style: "check",
        items: [
          "Human resources and people operations, including employee and intern records, onboarding, attendance, leave, and related workflows.",
          "Finance and expense management, including budgets, expense records, approvals, and financial summaries.",
          "Project and campaign management, including tasks, responsibilities, milestones, timelines, and progress tracking.",
          "Document management, internal approvals, organisational records, dashboards, and reports where available.",
        ],
      },
      { t: "p", text: "Available functionality may vary by plan, configuration, permissions, and technical availability." },
      { t: "note", text: "WorkSphere is an administrative management and workflow tool and does not replace professional legal, accounting, tax and medical, or other regulated advice. Customers remain responsible for decisions made using Platform information or outputs." },
    ],
  },
  {
    id: "eligibility", title: "Eligibility and Account Registration", icon: UserCheck,
    blocks: [
      { t: "p", text: "You must provide accurate and current information when registering for or using an account. You must meet applicable age and legal eligibility requirements and use the Platform only for lawful organisational or business purposes." },
      { t: "p", text: "Access may require an invitation or approval from a Customer administrator. The Provider may request reasonable information to verify an account or protect the Platform." },
    ],
  },
  {
    id: "security", title: "Account Security and User Responsibilities", icon: Lock,
    blocks: [
      {
        t: "list", style: "check",
        items: [
          "Keep credentials confidential and do not permit another person to use your account.",
          "Use available security features and promptly report suspected unauthorised access or compromised credentials.",
          "Do not attempt to access another user’s account, workspace, records, or permissions without authority.",
          "Provide truthful information and keep account details reasonably up to date.",
          "Comply with these Terms, applicable law, and the Customer’s lawful internal policies.",
        ],
      },
      { t: "p", text: "Customers are responsible for appointing workspace administrators, assigning appropriate access levels, reviewing permissions, and promptly removing access when a user no longer requires it." },
    ],
  },
  {
    id: "data", title: "Customer Data and Data Ownership", icon: Database,
    blocks: [
      { t: "p", text: "As between the Provider and the Customer, the Customer retains its rights in Customer Data. The Customer is responsible for the accuracy, lawfulness, completeness, and appropriateness of the data it and its Authorised Users submit." },
      { t: "p", text: "The Customer grants the Provider a limited, non-exclusive right to host, store, transmit, reproduce, and process Customer Data only as reasonably necessary to provide, secure, maintain, and support the Services, comply with law, and enforce these Terms." },
      { t: "p", text: "The Customer must ensure that it has the rights, permissions, notices, and lawful basis required to upload and process personal information, employee records, financial information, confidential documents, or third-party content." },
      { t: "p", text: "Customers should retain appropriate copies of important records. Any export, backup, or restoration functionality is subject to the features and limits made available for the relevant service." },
    ],
  },
  {
    id: "privacy", title: "Privacy and Data Protection", icon: Shield,
    blocks: [
      { t: "p", text: "Personal information processed through WorkSphere must be handled in accordance with applicable data-protection laws and the applicable Privacy Notice. The Provider and Customer must each comply with the legal obligations that apply to their respective roles." },
      { t: "p", text: "Where the Provider processes personal data on a Customer’s behalf, the parties may enter into a separate data-processing agreement describing instructions, security measures, subprocessors, assistance, retention, deletion, and other required terms." },
      { t: "p", text: "Customers are responsible for providing appropriate notices to individuals whose personal information they submit to WorkSphere and for limiting access to authorised personnel." },
      { t: "note", text: "The Platform must not be used to process sensitive or specially protected personal information unless the use is lawful and appropriate safeguards and product functionality are in place." },
    ],
  },
  {
    id: "acceptable-use", title: "Acceptable Use", icon: Ban,
    blocks: [
      { t: "p", text: "You must use WorkSphere responsibly and lawfully. You must not:" },
      {
        t: "list", style: "x",
        items: [
          "Use the Platform for fraud, unlawful discrimination, harassment, infringement, or any unlawful activity.",
          "Upload malware, malicious code, spam, or content designed to disrupt or compromise systems.",
          "Circumvent security controls, role permissions, authentication, billing controls, or technical limits.",
          "Probe, scan, disrupt, or interfere with the Platform or its infrastructure without written authorisation.",
          "Reverse engineer, decompile, scrape, copy, resell, sublicense, or create a competing service using the Platform, except where applicable law expressly permits or the Provider authorises it in writing.",
          "Upload or disclose information you do not have authority to use or disclose.",
          "Misrepresent your identity, authority, affiliation, or the source of content.",
        ],
      },
    ],
  },
  {
    id: "administration", title: "Workspace Administration and Approvals", icon: Settings,
    blocks: [
      { t: "p", text: "Customer administrators may manage users, permissions, workflows, records, and workspace settings. Customers are responsible for configuring access and approval processes appropriately for their operational and legal requirements." },
      { t: "p", text: "The Platform may record user activity, approvals, changes, or other audit information where such features are available. These records may support internal oversight but do not replace a Customer’s own compliance, supervision, or recordkeeping duties." },
      { t: "p", text: "The Customer is responsible for verifying critical information and for reviewing approvals, financial entries, HR records, inventory movements, and reports before relying on them." },
    ],
  },
  {
    id: "fees", title: "Fees, Billing, and Taxes", icon: CreditCard,
    blocks: [
      { t: "p", text: "Where WorkSphere is provided on a paid basis, the applicable plan, fees, billing cycle, currency, payment method, taxes, renewal terms, and usage limits will be set out in the relevant order, subscription page, invoice, or separate written agreement." },
      { t: "p", text: "The Customer must pay amounts due in accordance with the agreed payment terms. Taxes, duties, or similar charges will be handled as specified in the applicable order and law." },
      { t: "p", text: "Subject to applicable law and any agreed notice period, the Provider may restrict paid access for overdue undisputed amounts. Refunds, credits, cancellations, and trial terms are governed by the applicable subscription or written agreement and mandatory law." },
    ],
  },
  {
    id: "third-party", title: "Third-Party Services and Integrations", icon: Plug,
    blocks: [
      { t: "p", text: "The Platform may rely on third-party hosting, communications, authentication, analytics, payment, or integration services. Those services may be governed by separate terms and privacy policies." },
      { t: "p", text: "The Provider is not responsible for third-party services outside its reasonable control. Integrations may be modified, replaced, or discontinued where reasonably necessary for security, legal, technical, or operational reasons." },
    ],
  },
  {
    id: "availability", title: "Availability, Maintenance, and Support", icon: Activity,
    blocks: [
      { t: "p", text: "The Provider will use reasonable efforts to maintain the Platform but does not guarantee uninterrupted, error-free, or continuous availability unless a separate written service-level agreement expressly states otherwise." },
      { t: "p", text: "Access may be interrupted for maintenance, upgrades, security measures, emergency repairs, third-party outages, or circumstances beyond the Provider’s reasonable control." },
      { t: "p", text: "Support channels, hours, response targets, implementation services, and any service-level commitments are those expressly agreed in writing or stated in the applicable service plan." },
    ],
  },
  {
    id: "ip", title: "Intellectual Property and Product Identity", icon: Copyright,
    blocks: [
      { t: "p", text: "The Platform, including its software, source code, architecture, design, interface, documentation, features, and branding, is owned by or licensed to the relevant rights holder. Except for the limited right to use the Platform under these Terms, no intellectual-property rights are transferred to a Customer or user." },
      { t: "p", text: "The Customer retains its rights in Customer Data and grants only the limited permissions needed to provide the Services. The Customer must ensure that its uploaded content does not infringe another person’s rights." },
      { t: "note", text: "WorkSphere has been developed in the context of technology and digital-innovation initiatives associated with HopeTechSphere and Hopefelt Foundation. This association does not, by itself, establish ownership of WorkSphere, its source code, or its intellectual property by Hopefelt Foundation or HopeTechSphere. Ownership and licensing rights remain with the relevant rights holder and are governed by any applicable written agreement.", tone: "info" },
      { t: "p", text: "No party may use another party’s name, logo, or marks in a way that implies sponsorship, endorsement, or affiliation without prior written permission." },
    ],
  },
  {
    id: "confidentiality", title: "Confidentiality", icon: EyeOff,
    blocks: [
      { t: "p", text: "Each party may receive non-public business, technical, operational, financial, or organisational information from the other. The receiving party must protect such information using reasonable care and use it only for purposes related to the Services." },
      { t: "p", text: "Confidentiality obligations do not apply to information that is publicly available without breach, already lawfully known, independently developed, or lawfully received without a confidentiality duty. Disclosure required by law is permitted, subject to any legally available notice." },
    ],
  },
  {
    id: "termination", title: "Suspension and Termination", icon: PowerOff,
    blocks: [
      { t: "p", text: "A Customer may stop using WorkSphere or terminate a subscription in accordance with the applicable subscription or written service agreement." },
      { t: "p", text: "The Provider may suspend or restrict access where reasonably necessary to address a security risk, suspected unlawful activity, material breach of these Terms, overdue payment, or a threat to the Platform, other users, or data. Where practicable and lawful, notice and an opportunity to remedy the issue will be provided." },
      { t: "p", text: "On termination, access rights end, subject to any applicable data-export period, retention obligations, or separate written agreement. The Provider and Customer must handle Customer Data in accordance with the applicable agreement, Privacy Notice, and law." },
      { t: "p", text: "Terms that by their nature should continue after termination — including intellectual property, confidentiality, accrued payment obligations, disclaimers, liability limits, and dispute provisions — will survive to the extent applicable." },
    ],
  },
  {
    id: "disclaimers", title: "Disclaimers", icon: AlertTriangle,
    blocks: [
      { t: "p", text: "To the maximum extent permitted by law, WorkSphere is provided on an “as available” basis. The Provider does not warrant that the Platform will be uninterrupted, error-free, compatible with every system, or suitable for every particular requirement." },
      { t: "p", text: "Dashboards, calculations, reports, reminders, and workflow outputs depend on data entered, configuration, and available functionality. The Customer must verify critical information and must not rely on Platform outputs as the sole basis for decisions where independent review is appropriate." },
      { t: "p", text: "Nothing in these Terms excludes any warranty, right, or remedy that cannot lawfully be excluded." },
    ],
  },
  {
    id: "liability", title: "Limitation of Liability", icon: Scale,
    blocks: [
      { t: "p", text: "To the maximum extent permitted by applicable law, neither party is liable to the other for indirect, incidental, special, exemplary, punitive, or consequential loss, or for loss of profit, revenue, goodwill, business opportunity, or anticipated savings arising from use of the Services." },
      { t: "p", text: "To the maximum extent permitted by law, the Provider’s total aggregate liability arising out of or relating to the Services is limited to the fees paid or payable by the relevant Customer for the Services during the twelve (12) months preceding the event giving rise to the claim, unless a different limit is agreed in writing." },
      { t: "p", text: "Nothing in these Terms limits or excludes liability that cannot be limited or excluded under applicable law." },
    ],
  },
  {
    id: "indemnity", title: "Indemnity", icon: ShieldAlert,
    blocks: [
      { t: "p", text: "To the extent permitted by applicable law, the Customer is responsible for claims, losses, and expenses arising from its unlawful use of the Platform, its material breach of these Terms, or Customer Data that infringes another person’s rights. Any indemnity is subject to applicable law and any relevant written agreement." },
    ],
  },
  {
    id: "changes", title: "Changes to the Platform or Terms", icon: RefreshCw,
    blocks: [
      { t: "p", text: "The Provider may update or modify the Platform to improve functionality, security, performance, or legal compliance. Where a material change substantially affects a paid service, notice will be provided where reasonably practicable and as required by the applicable agreement or law." },
      { t: "p", text: "The Provider may revise these Terms from time to time. The revised version will identify its effective date. Where required by law or where changes are material, reasonable notice will be provided. Continued use after the revised Terms take effect constitutes acceptance to the extent permitted by law." },
    ],
  },
  // {
  //   id: "governing-law", title: "Governing Law and Dispute Resolution", icon: Gavel,
  //   blocks: [
  //     { t: "p", text: "These Terms are governed by the laws of [applicable jurisdiction], subject to any mandatory legal protections that apply." },
  //     { t: "p", text: "The parties will first attempt in good faith to resolve a dispute through written notice and discussion. If the dispute is not resolved within thirty (30) days, it may be referred to the competent courts of [agreed city and jurisdiction], unless applicable law requires another forum or the parties agree in writing to a lawful alternative." },
  //   ],
  // },
  {
    id: "general", title: "General Provisions", icon: ListChecks,
    blocks: [
      {
        t: "kv",
        items: [
          ["Entire agreement", "These Terms and any applicable order, subscription terms, privacy notice, or written service agreement form the agreement governing use of the Services."],
          ["Order of precedence", "If a signed written agreement expressly conflicts with these Terms, the signed agreement prevails for that conflict."],
          ["Severability", "If any provision is unenforceable, the remaining provisions continue in effect to the extent permitted by law."],
          ["No waiver", "Failure to enforce a provision is not a waiver of the right to enforce it later."],
          ["Assignment", "Neither party may assign its rights or obligations except as permitted by the applicable agreement or law."],
          ["Force majeure", "Neither party is responsible for delay caused by circumstances beyond its reasonable control, except for obligations that cannot be excused by law."],
          ["Independent parties", "These Terms do not create a partnership, joint venture, employment, agency, or fiduciary relationship between the Provider and Customer."],
        ],
      },
    ],
  },
  {
    id: "contact", title: "Contact", icon: Mail,
    blocks: [
      { t: "p", text: "Questions or notices relating to these Terms may be sent to the WorkSphere contact designated in the relevant account, order, or service agreement." },
      {
        t: "contact",
        items: [
          ["Service Provider", "Hopefelt Foundation"],
          ["Email", "hopefeltfoundation@gmail.com"],
          ["Address", "Green Town, Karachi Pakistan"],
        ],
      },
    ],
  },
];

const HIGHLIGHTS = [
  { icon: Users, title: "Your organisation, your data", text: "Customers keep ownership of their Customer Data and control who can access it." },
  { icon: Lock, title: "Secure and lawful use", text: "Protect credentials, respect permissions, and use WorkSphere only for lawful purposes." },
  { icon: ClipboardCheck, title: "Verify what matters", text: "Reports and workflow outputs support decisions — they don’t replace professional advice." },
];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, "0");

// Highlights [bracketed placeholders] so they are easy to spot and fill in.
function Text({ children }) {
  const parts = String(children).split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span key={i} className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.92em] font-medium text-amber-800">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function Block({ block }) {
  switch (block.t) {
    case "p":
      return <p className="text-[15px] leading-7 text-slate-600"><Text>{block.text}</Text></p>;

    case "list":
      return (
        <ul className="space-y-3">
          {block.items.map((x) => (
            <li key={x} className="flex gap-3 text-[15px] leading-7 text-slate-600">
              {block.style === "x" ? (
                <XCircle size={20} className="mt-1 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 size={20} className="mt-1 shrink-0 text-indigo-500" />
              )}
              <span>{x}</span>
            </li>
          ))}
        </ul>
      );

    case "defs":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          {block.items.map(([term, def]) => (
            <div key={term} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <dt className="text-sm font-semibold text-indigo-700">“{term}”</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-600">{def}</dd>
            </div>
          ))}
        </dl>
      );

    case "kv":
      return (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
          {block.items.map(([label, text]) => (
            <div key={label} className="grid gap-1 bg-white p-4 sm:grid-cols-[180px_1fr] sm:gap-6">
              <div className="text-sm font-semibold text-slate-900">{label}</div>
              <div className="text-sm leading-6 text-slate-600">{text}</div>
            </div>
          ))}
        </div>
      );

    case "note": {
      const info = block.tone === "info";
      return (
        <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-6 ${info ? "border-indigo-100 bg-indigo-50/70 text-indigo-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
          <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${info ? "text-indigo-500" : "text-amber-500"}`} />
          <p>{block.text}</p>
        </div>
      );
    }

    case "contact":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {block.items.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
              <div className="mt-1.5 text-sm leading-6 text-slate-700"><Text>{value}</Text></div>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

function SectionCard({ section, index }) {
  const Icon = section.icon;
  return (
    <section
      id={section.id}
      className="scroll-mt-28 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(79,70,229,0.12)] transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-12px_rgba(79,70,229,0.2)] sm:p-8"
    >
      <header className="mb-5 flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25">
          <Icon size={20} />
        </span>
        <div>
          <div className="text-xs font-semibold tracking-widest text-indigo-500">SECTION {pad(index + 1)}</div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">{section.title}</h2>
        </div>
      </header>
      <div className="space-y-4">
        {section.blocks.map((b, i) => <Block key={i} block={b} />)}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function TermsAndConditions() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [showTop, setShowTop] = useState(false);

  // Highlight the current section in the table of contents while scrolling.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  const goTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms & Conditions"
      description="The rules for using WorkSphere responsibly, securely, and within the scope of your organisation’s authorisation."
      icon="terms"
    >
      <main className="relative bg-gradient-to-b from-[#f4f7ff] via-[#f8fbff] to-white px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          {/* Intro */}
          <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 font-medium text-indigo-700 shadow-sm">
              <FileText size={14} /> Integrated Organisational Management Portal
            </span>
            <span>Applies to organisational customers and authorised users.</span>
          </div>

          {/* Highlights */}
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={19} />
                </span>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
              </div>
            ))}
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[270px_minmax(0,1fr)]">
            {/* Table of contents */}
            <aside className="lg:sticky lg:top-24">
              <nav aria-label="Table of contents" className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
                <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">On this page</div>
                <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto pr-1">
                  {SECTIONS.map((s, i) => {
                    const on = active === s.id;
                    return (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={goTo(s.id)}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${on ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                        >
                          <span className={`w-5 text-xs tabular-nums ${on ? "text-indigo-500" : "text-slate-300"}`}>{pad(i + 1)}</span>
                          <span className="flex-1 leading-snug">{s.title}</span>
                          {on && <ChevronRight size={14} />}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* Sections */}
            <div className="space-y-5">
              {SECTIONS.map((s, i) => <SectionCard key={s.id} section={s} index={i} />)}

              {/* Acceptance */}
              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-7 text-white shadow-xl shadow-indigo-500/20 sm:p-9">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex gap-4">
                  <CheckCircle2 size={26} className="mt-1 shrink-0 text-indigo-100" />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Acceptance</h2>
                    <p className="mt-2 text-[15px] leading-7 text-indigo-50">
                      By creating an account, accepting an invitation, signing an applicable order, or using WorkSphere, the Customer and its Authorised Users acknowledge that they have read and agree to these Terms, subject to the applicable service arrangement and law.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Back to top */}
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 ${showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
        >
          <ArrowUp size={18} />
        </button>
      </main>
    </InfoPage>
  );
}