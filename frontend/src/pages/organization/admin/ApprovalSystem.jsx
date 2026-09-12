import React, { useContext } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { ClipboardCheck, UserCheck, Handshake, Wallet, FileText, Check, Ban } from 'lucide-react';

// Centralizes every OrgAdmin-responsibility approval queue into one screen
// (spec section 15) by reading from state already loaded elsewhere in the
// app, rather than introducing a separate approvals data model. Organization
// Approval itself stays a Super Admin-only screen (Organization Management)
// per spec section 7 — it's intentionally not aggregated here.
const ApprovalSystem = () => {
  const {
    users, updateStaffStatus,
    partners, updatePartnerStatus,
    expenses, updateExpenseStatus,
    documents, updateDocumentStatus
  } = useContext(AppContext);

  const pendingUsers = users.filter((u) => u.status === 'Pending');
  const pendingPartners = partners.filter((p) => p.status === 'Pending');
  const pendingExpenses = expenses.filter((e) => e.status === 'Pending');
  const pendingDocuments = documents.filter((d) => d.status === 'Pending');

  const totalPending = pendingUsers.length + pendingPartners.length + pendingExpenses.length + pendingDocuments.length;

  const Section = ({ icon: Icon, title, count, children }) => (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon size={18} className="text-indigo-600" />
        <h2 className="font-bold text-black">{title}</h2>
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{count} pending</span>
      </div>
      <div className="divide-y divide-gray-50">
        {count === 0 ? (
          <div className="px-6 py-6 text-center text-gray-400 text-sm">Nothing pending here.</div>
        ) : children}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <ClipboardCheck size={26} className="text-indigo-600" /> Approval System
        </h1>
        <p className="text-gray-600 mt-1">
          Everything waiting on your review, in one place — {totalPending} item{totalPending === 1 ? '' : 's'} pending.
          Organization approval itself is handled by the platform (Super Admin).
        </p>
      </div>

      <Section icon={UserCheck} title="User Approval" count={pendingUsers.length}>
        {pendingUsers.map((u) => (
          <div key={u.id} className="px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black">{u.fullName}</p>
              <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
            </div>
            <button onClick={() => updateStaffStatus(u.id, 'Active')} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition">
              <Check size={14} /> Approve
            </button>
          </div>
        ))}
      </Section>

      <Section icon={Handshake} title="Partnership Approval" count={pendingPartners.length}>
        {pendingPartners.map((p) => (
          <div key={p.id} className="px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black">{p.name}</p>
              {p.partnershipType && <p className="text-xs text-gray-500">{p.partnershipType}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => updatePartnerStatus(p.id, 'Active')} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition">
                <Check size={14} /> Approve
              </button>
              <button onClick={() => updatePartnerStatus(p.id, 'Rejected')} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                <Ban size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </Section>

      <Section icon={Wallet} title="Expense Approval" count={pendingExpenses.length}>
        {pendingExpenses.map((e) => (
          <div key={e.id} className="px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black">{e.description}</p>
              <p className="text-xs text-gray-500">{Number(e.amount).toLocaleString()}{e.category ? ` · ${e.category}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateExpenseStatus(e.id, 'Approved')} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition">
                <Check size={14} /> Approve
              </button>
              <button onClick={() => updateExpenseStatus(e.id, 'Rejected')} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                <Ban size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </Section>

      <Section icon={FileText} title="Document Approval" count={pendingDocuments.length}>
        {pendingDocuments.map((d) => (
          <div key={d.id} className="px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black">{d.title}</p>
              {d.category && <p className="text-xs text-gray-500">{d.category}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateDocumentStatus(d.id, 'Approved')} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition">
                <Check size={14} /> Approve
              </button>
              <button onClick={() => updateDocumentStatus(d.id, 'Rejected')} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                <Ban size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </Section>
    </DashboardLayout>
  );
};

export default ApprovalSystem;
