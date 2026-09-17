
import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { InfoPage, ContentCard } from "./InfoPage";

export default function TermsAndConditions() {
  return (
    <InfoPage eyebrow="Legal" title="Terms & Conditions" description="The rules for using WorkSphere responsibly, securely, and within the scope of your organization’s authorization." icon="terms">
      <main className="bg-[#f8fbff] px-[5%] py-12 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <strong>Important:</strong> These terms are a product-ready draft. Before production use, have the final wording reviewed for the organization’s governing jurisdiction and contracting requirements.
          </div>
          <ContentCard title="1. Acceptance of these terms" id="terms-1">
            <p>By accessing or using WorkSphere, you agree to these Terms & Conditions and to use the platform only for lawful organizational purposes. If you are using WorkSphere on behalf of an organization, you confirm that you are authorized to do so.</p>
          </ContentCard>
          <ContentCard title="2. Workspaces and accounts" id="terms-2">
            <p>Each organization is responsible for maintaining accurate account information, managing its personnel, and ensuring that users receive only the access appropriate to their responsibilities.</p>
            <p>Users must keep their credentials confidential and must not share accounts or attempt to access another user’s workspace without authorization.</p>
          </ContentCard>
          <ContentCard title="3. Acceptable use" id="terms-3">
            <ul className="space-y-2">
              {["Do not use WorkSphere for unlawful, fraudulent, abusive, or deceptive activity.", "Do not attempt to bypass authentication, permissions, subscription controls, or other access restrictions.", "Do not upload content that you do not have the right to use or share.", "Do not intentionally disrupt the availability or integrity of the platform."].map(x => <li key={x} className="flex gap-2"><CheckCircle2 size={18} className="mt-1 shrink-0 text-indigo-500"/><span>{x}</span></li>)}
            </ul>
          </ContentCard>
          <ContentCard title="4. Organization content and responsibility" id="terms-4">
            <p>Your organization remains responsible for the information it enters into WorkSphere, including user records, operational records, documents, communications, and other content. Administrators should establish internal rules for accuracy, retention, access, and appropriate use.</p>
          </ContentCard>
          <ContentCard title="5. AI-assisted features" id="terms-5">
            <p>Where AI-assisted functionality is available, generated or structured results should be reviewed by an appropriately qualified user before being relied upon for important decisions. AI output may be incomplete or inaccurate and should not replace professional judgment.</p>
          </ContentCard>
          <ContentCard title="6. Subscriptions and payments" id="terms-6">
            <p>Paid plans, trial periods, billing cycles, amounts, and subscription states are presented by the platform and may be subject to the applicable plan terms. Payment records are maintained as operational and audit information; sensitive payment credentials should not be entered into WorkSphere except through the designated payment experience.</p>
          </ContentCard>
          <ContentCard title="7. Availability and changes" id="terms-7">
            <p>We may improve, modify, suspend, or retire features as the platform evolves. We will aim to preserve the usefulness and security of the service while making reasonable efforts to communicate material changes.</p>
          </ContentCard>
          <ContentCard title="8. Suspension and termination" id="terms-8">
            <p>Access may be restricted where necessary for security, policy enforcement, non-payment, misuse, or other legitimate operational reasons. Organizations should maintain appropriate backups and records for information they need independently of the service.</p>
          </ContentCard>
          <ContentCard title="9. Disclaimer and limitation" id="terms-9">
            <p>WorkSphere is provided as a management platform and is not a substitute for professional, legal, medical, financial, or other regulated advice. To the extent permitted by applicable law, use of the platform is at the user’s and organization’s responsibility.</p>
          </ContentCard>
          <ContentCard title="10. Contact and updates" id="terms-10">
            <p>Questions about these terms can be sent through the Help & Support page. The current version published on this site governs use of the platform, subject to applicable law and any separate agreement entered into with an organization.</p>
          </ContentCard>
        </div>
      </main>
    </InfoPage>
  );
}
