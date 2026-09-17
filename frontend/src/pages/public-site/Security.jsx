
import React from "react";
import { CheckCircle2, KeyRound, LogOut, UserCog, ShieldCheck, Smartphone, AlertTriangle } from "lucide-react";
import { InfoPage, ContentCard } from "./InfoPage";

export default function Security() {
  const tips = [
    [KeyRound, "Use a strong, unique password", "Never reuse your WorkSphere password on another service. Prefer a long passphrase and keep it private."],
    [LogOut, "Sign out on shared devices", "Always log out when using a public, shared, or borrowed computer. Close the browser after sensitive work."],
    [UserCog, "Review access", "Organization administrators should remove inactive users and regularly review role and Accessibility permissions."],
    [Smartphone, "Protect your device", "Keep your operating system, browser, and security software up to date and use a screen lock."],
    [ShieldCheck, "Use trusted networks", "Avoid untrusted computers and networks for sensitive work. Prefer a secure private connection when possible."],
    [AlertTriangle, "Report suspicious activity", "If you notice unexpected access, unfamiliar changes, or suspicious messages, stop using the session and contact your organization/support team."]
  ];
  return (
    <InfoPage eyebrow="User Security" title="Security you can control from the client side." description="This page focuses deliberately on the actions a WorkSphere user or organization administrator can take in the browser and account experience. It does not describe developer or server-side security controls." icon="security">
      <main className="bg-[#f8fbff] px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
            <p className="text-sm font-bold text-indigo-900">The user-security checklist</p>
            <p className="mt-1 text-sm leading-6 text-indigo-800">Strong credentials + correct permissions + protected devices + careful sharing = a safer workspace.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tips.map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={20}/></div>
                <h2 className="mt-4 text-lg font-extrabold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-5">
            <ContentCard title="Before you share sensitive information" id="security-share">
              <ul className="space-y-2">
                {["Confirm the recipient and organization.", "Share the minimum information needed for the task.", "Check that the recipient has the appropriate role/access.", "Avoid sending passwords, recovery codes, or payment credentials in messages or documents."].map(x => <li key={x} className="flex gap-2"><CheckCircle2 size={18} className="mt-1 shrink-0 text-indigo-500"/><span>{x}</span></li>)}
              </ul>
            </ContentCard>
            <ContentCard title="Account recovery" id="security-recovery">
              <p>Use the password recovery flow when you cannot sign in. Never ask another user to give you their password. If you believe an account has been compromised, contact the organization administrator or support team promptly.</p>
            </ContentCard>
            <ContentCard title="Administrator checklist" id="security-admin">
              <ul className="space-y-2">
                {["Review active users regularly.", "Grant only the access needed for a role.", "Remove access when a person leaves or changes responsibilities.", "Review audit activity when investigating unexpected changes.", "Educate staff on phishing and credential safety."].map(x => <li key={x} className="flex gap-2"><CheckCircle2 size={18} className="mt-1 shrink-0 text-indigo-500"/><span>{x}</span></li>)}
              </ul>
            </ContentCard>
          </div>
        </div>
      </main>
    </InfoPage>
  );
}
