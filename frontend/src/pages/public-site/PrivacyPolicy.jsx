import React, { useEffect, useState } from "react";
import {
  FileText, Users, Database, Target, Scale, KeyRound, Stethoscope, CreditCard,
  Share2, Globe, Clock, ShieldCheck, Siren, UserRound, Baby, Cookie, ExternalLink,
  RefreshCw, Mail, CheckCircle2, ArrowUp, ChevronRight, Eye, FileLock2, AlertTriangle,
} from "lucide-react";
import { InfoPage } from "./InfoPage";

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/*  Block types: p | list | defs | note | contact                      */
/*  `defs` items are [title, description] tiles.                       */
/* ------------------------------------------------------------------ */
const SECTIONS = [
  {
    id: "introduction", title: "Introduction and Scope", icon: FileText,
    blocks: [
      { t: "p", text: "WorkSphere (“WorkSphere”, “we”, “us”, or “our”) is an organisational management platform associated with Hopefelt Foundation’s IT & Technology Department and presented as a flagship digital product of Hopefelt Foundation." },
      { t: "p", text: "This Privacy Policy describes the categories of information that may be processed through WorkSphere, the purposes of processing, how information may be shared, and the choices and responsibilities of organisations and users." },
      { t: "p", text: "This Policy applies to the WorkSphere website, account registration, organisation workspaces, and platform features made available to users. Specific features may process different categories of information depending on how an organisation configures and uses them." },
    ],
  },
  {
    id: "roles", title: "Roles and Responsibilities", icon: Users,
    blocks: [
      { t: "p", text: "The organisation that creates or manages a workspace generally determines what information is entered into that workspace and which users may access it. That organisation is responsible for its own legal obligations relating to information it controls." },
      { t: "p", text: "The entity or individual legally operating WorkSphere may process information to provide, secure, maintain, and support the platform. Depending on the circumstances and applicable law, the operator may act as a controller, processor, service provider, or equivalent role." },
      { t: "note", tone: "info", text: "WorkSphere’s legal operator and its contact details should be identified in the final published version of this Policy. References to Hopefelt Foundation describe the platform’s stated affiliation and do not, by themselves, determine the legal identity of the data controller or service provider." },
    ],
  },
  {
    id: "information", title: "Information We May Process", icon: Database,
    blocks: [
      { t: "p", text: "The information processed depends on the features used, the information supplied by users, and the organisation’s configuration. Categories may include:" },
      {
        t: "defs",
        items: [
          ["Account and profile", "Name, email address, login credentials in protected form, user role, organisation membership, account status, and profile details."],
          ["Organisation and operations", "Tasks, projects, campaigns, events, camps, meetings, documents, discussions, notifications, schedules, availability, and related records."],
          ["HR and volunteers", "Employee, intern, volunteer, and team records; role assignments; onboarding information; attendance or leave records where those modules are used."],
          ["Finance and transactions", "Budgets, expenses, payment status, subscription plan, amount, currency, transaction reference, payment gateway, and limited non-sensitive provider metadata."],
          ["Donors, sponsors, beneficiaries, partners", "Records entered by an organisation for its operational, fundraising, outreach, or programme activities."],
          ["Inventory and assets", "Item records, stock movements, asset assignments, procurement details, and related audit entries."],
          ["Technical and security", "Access logs, timestamps, device or browser information, diagnostic data, IP address where collected, authentication events, and records used to investigate suspicious activity."],
          ["AI-assisted prescription", "When the feature is used: patient names, medicine information, instructions, voice transcripts, audio, or audio metadata supplied through that feature."],
        ],
      },
    ],
  },
  {
    id: "use", title: "How We Use Information", icon: Target,
    blocks: [
      { t: "p", text: "Information may be processed for the following purposes:" },
      {
        t: "list",
        items: [
          "Create and administer accounts, authenticate users, and provide access to organisation workspaces.",
          "Operate HR, finance, project, campaign, event, inventory, document, approval, and reporting functions.",
          "Support collaboration, workflow notifications, service messages, and organisation-level administration.",
          "Process subscriptions, payments, invoices, transaction records, and related customer support.",
          "Maintain security, enforce permissions, investigate misuse, prevent fraud, troubleshoot errors, and preserve auditability.",
          "Monitor performance, understand service reliability, and improve platform functionality.",
          "Meet contractual obligations, comply with applicable law, respond to lawful requests, and establish or defend legal claims.",
        ],
      },
    ],
  },
  {
    id: "legal-grounds", title: "Legal Grounds for Processing", icon: Scale,
    blocks: [
      { t: "p", text: "Where applicable law requires a legal basis for processing personal information, the appropriate basis may include performance of a contract, compliance with a legal obligation, legitimate interests that are not overridden by individual rights, consent, or another lawful basis recognised by applicable law." },
      { t: "p", text: "The organisation controlling a workspace is responsible for identifying and documenting the legal basis for information it submits. Where consent is relied upon, it should be collected and recorded appropriately and may be withdrawn as permitted by law." },
    ],
  },
  {
    id: "organisation-control", title: "Organisation-Controlled Information and Access", icon: KeyRound,
    blocks: [
      { t: "p", text: "Organisations are responsible for deciding what information to enter into their workspaces and who should be able to view, edit, approve, export, or delete it." },
      { t: "p", text: "Organisation administrators should apply least-privilege access, review user roles regularly, remove access when no longer required, and take particular care with HR, financial, beneficiary, donor, and health-related records." },
      { t: "p", text: "Users should contact their organisation administrator for requests concerning records managed by that organisation. WorkSphere may assist the organisation where required by the applicable service arrangement and law." },
    ],
  },
  {
    id: "ai", title: "AI-Assisted Prescription Functionality", icon: Stethoscope,
    blocks: [
      { t: "p", text: "If an organisation or user chooses to use AI-assisted prescription functionality, information submitted to that feature may include patient names, medicine names, dosage or use instructions, voice recordings, transcripts, and related audio metadata." },
      { t: "p", text: "This information may be particularly sensitive. Users and organisations should submit it only when authorised, necessary, and lawful, and should avoid entering unnecessary patient-identifying details." },
      { t: "note", text: "AI-assisted outputs may be incomplete or incorrect and must be reviewed by an appropriately qualified healthcare professional before they are relied upon for clinical decisions or communicated as medical instructions. WorkSphere is not a substitute for professional medical judgement." },
      { t: "p", text: "The final service configuration and any applicable AI provider terms should explain whether submitted content is transmitted to third-party AI providers, how it is protected, whether it is retained, and whether it is used to train or improve models." },
    ],
  },
  {
    id: "payments", title: "Payments and Financial Information", icon: CreditCard,
    blocks: [
      { t: "p", text: "WorkSphere may maintain records needed to manage subscriptions and payments, including the selected plan, amount, currency, transaction reference, payment gateway, payment status, and non-sensitive provider metadata." },
      { t: "p", text: "The platform’s intended payment data structure does not store card data in payment metadata. Actual payment handling depends on the configured payment gateway and implementation. Users should refer to the gateway’s own privacy terms for information it collects directly." },
      { t: "p", text: "Access to financial records should be restricted according to organisational roles and business need." },
    ],
  },
  {
    id: "sharing", title: "Sharing and Service Providers", icon: Share2,
    blocks: [
      { t: "p", text: "Information may be shared only as reasonably necessary for the purposes described in this Policy, under the applicable service arrangement, or as required or permitted by law. Potential recipients include:" },
      {
        t: "list",
        items: [
          "Hosting, cloud infrastructure, database, storage, and security providers.",
          "Authentication, email, notification, and customer-support providers.",
          "AI service providers, where an AI-assisted feature is used and the relevant information is transmitted to them.",
          "Payment processors or gateways for subscription and transaction processing.",
          "Analytics, monitoring, and diagnostic providers where these services are configured.",
          "Professional advisers, regulators, law-enforcement authorities, or other parties where disclosure is legally required or reasonably necessary to protect rights, safety, and security.",
        ],
      },
      { t: "p", text: "The actual providers, purposes, data categories, locations, and applicable safeguards should be reflected in the service’s current provider and subprocessor information." },
      { t: "note", tone: "info", text: "We do not sell personal information as a standalone data-broker product." },
    ],
  },
  {
    id: "transfers", title: "International Data Transfers", icon: Globe,
    blocks: [
      { t: "p", text: "Information may be processed or stored in countries other than the country where the user or organisation is located, depending on hosting and service-provider arrangements." },
      { t: "p", text: "Where applicable law requires safeguards for international transfers, the responsible parties will use an appropriate transfer mechanism and supplementary safeguards where required. The countries, transfer mechanisms, and relevant provider details should be made available where legally required." },
    ],
  },
  {
    id: "retention", title: "Data Retention", icon: Clock,
    blocks: [
      { t: "p", text: "Information should be retained only for as long as reasonably necessary for the purpose for which it was collected, including service delivery, account administration, security, dispute resolution, accounting, legal compliance, and enforcement of agreements." },
      { t: "p", text: "Retention periods vary by data category, organisation settings, legal requirements, and technical backup cycles. When information is no longer required, it should be deleted, anonymised, or securely disposed of, subject to lawful retention requirements and legitimate security needs." },
      { t: "p", text: "Organisations are responsible for defining retention requirements for records they control. WorkSphere’s operator should maintain and apply documented retention and deletion schedules for platform-level records." },
    ],
  },
  {
    id: "security", title: "Security Measures", icon: ShieldCheck,
    blocks: [
      { t: "p", text: "Reasonable technical and organisational measures should be used to protect information against unauthorised access, loss, misuse, alteration, or disclosure. Measures may include access controls, authentication, role-based permissions, secure transmission, monitoring, backups, and administrative safeguards, depending on the deployed configuration." },
      { t: "p", text: "No method of electronic storage or transmission is completely secure. Users should protect their credentials, use available security features, and report suspected account compromise or data exposure promptly." },
      { t: "p", text: "Access to security and audit records is restricted according to administrative controls and operational need." },
    ],
  },
  {
    id: "breaches", title: "Data Breaches and Security Incidents", icon: Siren,
    blocks: [
      { t: "p", text: "Suspected security incidents should be reported promptly through the official WorkSphere support or security contact. The operator will assess and respond to incidents in accordance with its incident-response procedures and applicable law." },
      { t: "p", text: "Where notification to an organisation, affected individuals, regulators, or another authority is legally required, the responsible party will provide notice within the applicable timeframe and with the information required by law." },
    ],
  },
  {
    id: "rights", title: "Your Privacy Rights and Choices", icon: UserRound,
    blocks: [
      { t: "p", text: "Depending on applicable law, individuals may have rights to request access to, correction of, deletion of, restriction of, or objection to certain processing of their personal information, and may have rights to data portability or to withdraw consent where consent is the legal basis." },
      { t: "p", text: "Requests relating to information held within an organisation’s workspace should normally be directed to that organisation, which is best placed to assess the request and determine whether it can be fulfilled. WorkSphere’s operator will provide assistance where required by law or contract." },
      { t: "p", text: "Some information may need to be retained to meet legal obligations, protect security, resolve disputes, or exercise legal rights. Any refusal or limitation will be handled in accordance with applicable law." },
    ],
  },
  {
    id: "children", title: "Children and Vulnerable Individuals", icon: Baby,
    blocks: [
      { t: "p", text: "WorkSphere is intended primarily for organisational use and is not designed to encourage children to create independent accounts without appropriate authorisation." },
      { t: "p", text: "Organisations that use the Platform to manage programmes involving children or vulnerable individuals must ensure they have lawful authority, appropriate notices or consents where required, suitable access controls, and safeguards proportionate to the sensitivity of the information." },
    ],
  },
  {
    id: "cookies", title: "Cookies and Similar Technologies", icon: Cookie,
    blocks: [
      { t: "p", text: "The WorkSphere website or application may use essential cookies or similar technologies to maintain sessions, support authentication, protect security, remember preferences, and maintain functionality. Analytics or optional technologies should be disclosed and controlled as required by applicable law." },
      { t: "p", text: "Where required, users will be given appropriate information and choices about non-essential cookies. Browser settings may also allow users to manage certain cookies, although disabling essential cookies may affect platform functionality." },
    ],
  },
  {
    id: "third-party", title: "Third-Party Websites and Services", icon: ExternalLink,
    blocks: [
      { t: "p", text: "WorkSphere may contain links to third-party websites or connect with third-party services. Those services operate under their own privacy notices and terms. The Provider is not responsible for third-party privacy practices outside its control, and users should review the relevant notices before submitting information to those services." },
    ],
  },
  {
    id: "updates", title: "Policy Updates", icon: RefreshCw,
    blocks: [
      { t: "p", text: "This Privacy Policy may be updated when WorkSphere’s features, service providers, data practices, or legal obligations change. The current version will display its effective date." },
      { t: "p", text: "Where a change is material or notice is required by law, users or organisation administrators will be notified through an appropriate channel. The updated Policy applies from its stated effective date, subject to applicable law." },
    ],
  },
  {
    id: "contact", title: "Contact and Privacy Requests", icon: Mail,
    blocks: [
      { t: "p", text: "For questions, complaints, or privacy requests, contact the responsible organisation or use the official WorkSphere privacy contact below. Requests relating to an organisation’s workspace may be referred to that organisation’s administrator or privacy contact." },
      {
        t: "contact",
        items: [
          ["Privacy contact", "Hopefelt Foundation"],
          ["Email", "hopefeltfoundation@gmail.com"],
          ["Address", "Green Town, Karachi Pakistan"],
        ],
      },
    ],
  },
];

const HIGHLIGHTS = [
  { icon: Database, title: "Purpose-limited", text: "Information is used to operate, secure, and improve the service." },
  { icon: FileLock2, title: "Access-aware", text: "Permissions are designed around organisational roles." },
  { icon: Eye, title: "Transparent", text: "We explain what the platform handles and why." },
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
      return <p className="text-[15px] leading-7 text-slate-600">{block.text}</p>;

    case "list":
      return (
        <ul className="space-y-3">
          {block.items.map((x) => (
            <li key={x} className="flex gap-3 text-[15px] leading-7 text-slate-600">
              <CheckCircle2 size={20} className="mt-1 shrink-0 text-indigo-500" />
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
              <dt className="text-sm font-semibold text-indigo-700">{term}</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-600">{def}</dd>
            </div>
          ))}
        </dl>
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
export default function PrivacyPolicy() {
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
      eyebrow="Legal & Data"
      title="Privacy Policy"
      description="A clear overview of the information WorkSphere may handle, why it is used, and the controls organisations and users have over it."
      icon="privacy"
    >
      <main className="relative bg-gradient-to-b from-[#f4f7ff] via-[#f8fbff] to-white px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          {/* Intro */}
          <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 font-medium text-indigo-700 shadow-sm">
              <FileText size={14} /> Hopefelt Foundation’s Flagship Management Platform
            </span>
            <span>How WorkSphere may collect, use, store, and share information.</span>
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