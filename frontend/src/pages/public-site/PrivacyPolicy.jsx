
import React from "react";
import { LockKeyhole, Eye, Database, UserRound, FileLock2 } from "lucide-react";
import { InfoPage, ContentCard } from "./InfoPage";

export default function PrivacyPolicy() {
  return (
    <InfoPage eyebrow="Legal & Data" title="Privacy Policy" description="A clear overview of the information WorkSphere may handle, why it is used, and the controls organizations and users have over it." icon="privacy">
      <main className="bg-[#f8fbff] px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [Database, "Purpose-limited", "Use information to operate, secure, and improve the service."],
              [FileLock2, "Access-aware", "Permissions are designed around organizational roles."],
              [Eye, "Transparent", "Explain what information the platform handles and why."]
            ].map(([Icon, t, d]) => <div key={t} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><Icon size={20} className="text-indigo-600"/><h3 className="mt-3 font-bold text-gray-900">{t}</h3><p className="mt-1 text-sm leading-6 text-gray-500">{d}</p></div>)}
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><strong>Important:</strong> This is a product-ready draft and should be legally reviewed before publication. Retention periods, legal bases, processor lists, international-transfer terms, and jurisdiction-specific rights should be finalized by the organization.</div>
          <ContentCard title="1. Information we may handle" id="privacy-1">
            <p>Depending on how WorkSphere is used, the platform may process account and profile information such as name, email address, role, organization membership, status, and information supplied by users.</p>
            <p>Operational information can include tasks, projects, campaigns, events, camps, meetings, documents, expenses, donor and sponsor records, volunteer and beneficiary records, discussions, notifications, availability information, and audit records.</p>
            <p>AI-assisted prescription functionality may process patient names, medicine information, instructions, voice transcripts, and audio metadata when that feature is used. Organizations should only enter information they are authorized to process.</p>
          </ContentCard>
          <ContentCard title="2. How information is used" id="privacy-2">
            <p>Information may be used to provide the workspace, authenticate users, enforce organization permissions, support collaboration, maintain audit trails, process subscriptions and payments, send service communications, provide analytics, prevent abuse, troubleshoot issues, and improve platform reliability.</p>
          </ContentCard>
          <ContentCard title="3. Organization-controlled information" id="privacy-3">
            <p>Organizations are responsible for deciding what information to place in their workspace and who should have access. Organization administrators should regularly review users, permissions, documents, and other sensitive records.</p>
          </ContentCard>
          <ContentCard title="4. Payments" id="privacy-4">
            <p>WorkSphere records payment and subscription information needed to operate billing, including plan, amount, currency, transaction reference, gateway, status, and non-sensitive provider metadata. The application schema is designed not to store card data in payment metadata.</p>
          </ContentCard>
          <ContentCard title="5. Security and access logs" id="privacy-5">
            <p>Security and audit information may be retained to investigate activity, enforce permissions, support troubleshooting, and maintain accountability. Access to these records is restricted according to the platform’s administrative controls.</p>
          </ContentCard>
          <ContentCard title="6. Sharing and service providers" id="privacy-6">
            <p>Information may be processed by service providers that help operate authentication, hosting, email, AI-assisted features, analytics, or payment services. The final published policy should identify the actual providers and applicable transfer mechanisms before launch.</p>
          </ContentCard>
          <ContentCard title="7. Your choices and requests" id="privacy-7">
            <p>Users may contact the organization that controls their workspace for questions about information in that workspace. Depending on applicable law, users may have rights concerning access, correction, deletion, restriction, objection, or portability. The organization should establish the appropriate process for responding to those requests.</p>
          </ContentCard>
          <ContentCard title="8. Retention" id="privacy-8">
            <p>Information should be retained only for as long as necessary for the relevant operational, contractual, security, accounting, legal, or organizational purpose. Exact retention schedules should be configured and documented by the service owner.</p>
          </ContentCard>
          <ContentCard title="9. Policy updates" id="privacy-9">
            <p>This policy may be updated when WorkSphere’s functionality, providers, or legal obligations change. The effective date should be updated whenever a material revision is published.</p>
          </ContentCard>
        </div>
      </main>
    </InfoPage>
  );
}
