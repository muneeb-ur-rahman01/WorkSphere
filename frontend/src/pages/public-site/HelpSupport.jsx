
import React from "react";
import { LifeBuoy, MessageCircle, BookOpen, ShieldCheck, ChevronRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { InfoPage } from "./InfoPage";

const steps = [
  ["1", "Describe the problem", "Tell us what you were trying to do, what happened, and the exact message you saw."],
  ["2", "Include useful context", "Mention the affected module, approximate time, browser/device, and whether the issue affects one or multiple users."],
  ["3", "Protect sensitive data", "Do not include passwords, recovery codes, payment credentials, or unnecessary personal/medical information in your message."],
];

export default function HelpSupport() {
  return (
    <InfoPage eyebrow="Help & Support" title="When you need a hand, start here." description="Find the fastest path to an answer, troubleshoot common account issues, and send a detailed support request directly from WorkSphere." icon="support">
      <main className="bg-[#f8fbff] px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [BookOpen, "Read the docs", "Learn how WorkSphere’s modules, roles, and workflows fit together.", "/documentation"],
              [LifeBuoy, "Browse FAQs", "Find quick answers to common account and workspace questions.", "/faqs"],
              [MessageCircle, "Send a message", "Use the support widget on this page to contact the team with your issue.", "#contact"],
            ].map(([Icon, title, text, to]) => (
              <Link key={title} to={to} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={20}/></div>
                <h2 className="mt-4 font-extrabold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">Open <ChevronRight size={14} className="transition group-hover:translate-x-0.5"/></span>
              </Link>
            ))}
          </div>

          <section className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Support request</p>
                <h2 className="mt-2 text-2xl font-extrabold text-gray-900">Make your message easy to resolve.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">The support widget in the bottom-right corner can submit a query to the WorkSphere support workflow.</p>
              </div>
              <div id="contact" className="rounded-xl bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-800">Look for <strong>“Have a question?”</strong> in the bottom-right corner.</div>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {steps.map(([n, title, text]) => <div key={n} className="rounded-xl border border-gray-100 bg-gray-50 p-5"><span className="text-xs font-black text-indigo-500">{n}</span><h3 className="mt-2 font-bold text-gray-900">{title}</h3><p className="mt-1 text-sm leading-6 text-gray-500">{text}</p></div>)}
            </div>
          </section>

          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex gap-3"><AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={19}/><div><h3 className="font-bold text-amber-900">Urgent account concern?</h3><p className="mt-1 text-sm leading-6 text-amber-800">If you suspect unauthorized access, stop sharing credentials, sign out of affected sessions, and notify your organization administrator/support team as soon as possible.</p></div></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Link to="/security" className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-200"><ShieldCheck className="text-indigo-600"/><div><h3 className="font-bold text-gray-900">Review client-side security</h3><p className="text-sm text-gray-500">Practical steps for safer everyday use.</p></div></Link>
            <Link to="/terms" className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-200"><BookOpen className="text-indigo-600"/><div><h3 className="font-bold text-gray-900">Read the terms</h3><p className="text-sm text-gray-500">Understand responsible platform use.</p></div></Link>
          </div>
        </div>
      </main>
    </InfoPage>
  );
}
