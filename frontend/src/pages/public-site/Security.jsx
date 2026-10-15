import React from "react";
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  UserCog,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  Share2,
  Eye,
} from "lucide-react";
import { InfoPage, ContentCard } from "./InfoPage";

const CheckList = ({ items }) => (
  <ul className="space-y-2">
    {items.map((x) => (
      <li key={x} className="flex gap-2">
        <CheckCircle2 size={18} className="mt-1 shrink-0 text-indigo-500" />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);

export default function Security() {
  const tips = [
    [
      KeyRound,
      "1. Protect Your Account",
      "Use a strong, unique password and never share your password, verification codes, or recovery details. Enable multi-factor authentication if available. Change your password immediately if you suspect it has been compromised.",
    ],
    [
      Smartphone,
      "2. Secure Your Device",
      "Keep your operating system, browser, and security software updated. Use a screen lock and avoid leaving WorkSphere open on an unattended device.",
    ],
    [
      LogOut,
      "3. Sign Out on Shared Devices",
      "Always sign out after using a public, shared, or borrowed computer. Close the browser after completing your work and never save credentials on shared devices.",
    ],
    [
      UserCog,
      "4. Review Access and Permissions",
      "Organisation administrators should grant users only the permissions required for their roles. Review active accounts regularly and remove access when a person leaves or changes responsibilities.",
    ],
    [
      ShieldCheck,
      "5. Use Trusted Networks",
      "Access WorkSphere through trusted devices and secure networks whenever possible. Avoid entering sensitive information on untrusted computers or ignoring browser security warnings.",
    ],
    [
      Share2,
      "6. Share Information Carefully",
      "Verify recipients before sharing documents or records. Share only the information necessary for the task, check access permissions, and use approved organisational channels for sensitive information.",
    ],
    [
      AlertTriangle,
      "7. Recognise Suspicious Activity",
      "Be cautious of unexpected login requests, suspicious links, unfamiliar changes, or messages requesting passwords, verification codes, or sensitive information. Verify unusual requests through a trusted channel.",
    ],
  ];

  return (
    <InfoPage
      eyebrow="User Security"
      title="Security you can control from the client side."
      description="WorkSphere helps users and organisation administrators manage workspace access responsibly. Follow these practices to protect your account, devices, and organisational information."
      icon="security"
    >
      <main className="bg-[#f8fbff] px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
            <p className="text-sm font-bold text-indigo-900">User Security Checklist</p>
            <p className="mt-1 text-sm leading-6 text-indigo-800">
              Strong credentials + correct permissions + protected devices + careful sharing = a safer workspace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tips.map(([Icon, title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={20} />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            <ContentCard title="Protect Sensitive Information" id="security-sensitive">
              <p className="mb-3">
                WorkSphere may support the management of organisational, HR, financial, donor, volunteer, beneficiary, and other operational records.
              </p>
              <CheckList
                items={[
                  "Access only the information required for your responsibilities.",
                  "Do not disclose confidential records without proper authorisation.",
                  "Avoid downloading sensitive information to personal devices unless authorised.",
                  "Submit personal or health-related information only when authorised and necessary.",
                  "Review AI-assisted prescription outputs with a qualified healthcare professional before relying on them.",
                ]}
              />
            </ContentCard>

            <ContentCard title="Account Recovery" id="security-recovery">
              <p>
                If you cannot access your account, use the official password-recovery process available through WorkSphere.
              </p>
              <p className="mt-3 font-semibold text-gray-900">If you suspect unauthorised access:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-6">
                <li>Stop using the suspicious session.</li>
                <li>Change your password from a trusted device, if possible.</li>
                <li>Contact your organisation administrator or WorkSphere support promptly.</li>
                <li>Report any unfamiliar activity or potentially exposed information.</li>
              </ol>
              <p className="mt-3">Never request or share another user's password to recover an account.</p>
            </ContentCard>

            <ContentCard title="Organisation Administrator Checklist" id="security-admin">
              <p className="mb-3">Administrators should:</p>
              <CheckList
                items={[
                  "Review users, roles, and permissions regularly.",
                  "Apply the principle of least-privilege access.",
                  "Remove inactive or unauthorised accounts promptly.",
                  "Review available activity records when investigating unexpected changes.",
                  "Establish clear procedures for sharing, exporting, and handling sensitive records.",
                  "Educate team members about phishing, password safety, and incident reporting.",
                ]}
              />
            </ContentCard>

            <ContentCard title="Report a Security Concern" id="security-report">
              <p>
                If you notice suspicious activity, unexpected account access, unauthorised changes, or possible information exposure, contact your organisation administrator or the official WorkSphere support team as soon as possible.
              </p>
              <p className="mt-3">
                <span className="font-semibold text-gray-900">Support:</span>{" "}
                [Insert official WorkSphere support email or reporting link]
              </p>
            </ContentCard>

            <ContentCard title="Security Notice" id="security-notice">
              <p>
                This page provides practical guidance for users and organisation administrators. It does not constitute a guarantee of security or describe WorkSphere's internal technical security controls. Users must follow applicable organisational policies, the WorkSphere Privacy Policy, and the Terms &amp; Conditions.
              </p>
            </ContentCard>
          </div>
        </div>
      </main>
    </InfoPage>
  );
}