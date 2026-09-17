
import React, { useMemo, useState } from "react";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { InfoPage } from "./InfoPage";

const FAQS = [
  ["Getting started", "What is WorkSphere?", "WorkSphere is a management operating system for organizations. It brings people, roles, tasks, operational records, communication, analytics, and administrative controls into one workspace."],
  ["Getting started", "Who can use WorkSphere?", "Organizations can create workspaces and manage users across roles such as Organization Admin, Employee, Intern, Volunteer, Membership, and Executive Director. Access depends on the role and permissions assigned by the organization."],
  ["Accounts", "How do I register an organization?", "Use Register Organization from the public site and complete the organization registration flow. After registration, the organization administrator can configure the workspace and personnel."],
  ["Accounts", "I forgot my password. What should I do?", "Use the Forgot Password flow from the login experience and follow the email instructions. If you still cannot access the account, contact your organization administrator or support."],
  ["Permissions", "What is Accessibility?", "Accessibility is the organization-admin permission area used to grant selected staff members access to additional sections beyond their normal role permissions."],
  ["Operations", "What can I manage in WorkSphere?", "Depending on access, WorkSphere supports tasks, projects, campaigns, camps, events, meetings, documents, expenses, donors, volunteers, sponsors, partners, beneficiaries, opportunities, discussions, notifications, and analytics."],
  ["AI", "Is AI output always accurate?", "No. AI-assisted features should be treated as assistance rather than an unquestionable source of truth. Review generated or structured results before relying on them, especially for important or regulated decisions."],
  ["Billing", "What plans are available?", "The current product configuration includes a 7-day trial and Basic, Standard, and Premium plans. Plan availability, pricing, and included features should be checked on the current pricing experience."],
  ["Security", "What can I do to protect my account?", "Use a unique password, protect your device, sign out on shared computers, avoid suspicious links, and contact your administrator/support team if you notice unexpected activity."],
  ["Support", "How do I contact support?", "Use the Help & Support page or the support/query widget available on the public site to send a message with your name, email, subject, and description of the issue."]
];

export default function FAQs() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(0);
  const filtered = useMemo(() => FAQS.filter(([cat, q, a]) => `${cat} ${q} ${a}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <InfoPage eyebrow="Help Center" title="Frequently asked questions." description="Quick answers to the questions people most often have about WorkSphere accounts, roles, operations, AI-assisted features, billing, and support." icon="faq">
      <main className="bg-[#f8fbff] px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19}/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search questions..." className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"/>
          </div>
          <div className="space-y-3">
            {filtered.map(([category, question, answer], i) => {
              const isOpen = open === i;
              return (
                <div key={question} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center gap-4 px-5 py-5 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><HelpCircle size={18}/></span>
                    <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500">{category}</span><span className="mt-1 block font-bold text-gray-900">{question}</span></span>
                    <ChevronDown size={19} className={`shrink-0 text-gray-400 transition ${isOpen ? "rotate-180" : ""}`}/>
                  </button>
                  {isOpen && <div className="border-t border-gray-100 px-5 pb-5 pl-[4.75rem] text-sm leading-7 text-gray-600">{answer}</div>}
                </div>
              );
            })}
          </div>
          {!filtered.length && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">No questions matched your search. Try a different phrase or contact support.</div>}
        </div>
      </main>
    </InfoPage>
  );
}
