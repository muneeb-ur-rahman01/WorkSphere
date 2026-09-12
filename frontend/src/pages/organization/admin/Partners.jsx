import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Handshake, Plus, Search, Edit, Trash2, Check, Ban } from 'lucide-react';

const emptyForm = { name: '', partnershipType: '', contactName: '', email: '', phone: '', responsibilities: '', agreementNotes: '' };

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Ended': return 'bg-gray-200 text-gray-700';
    case 'Rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const Partners = () => {
  const { partners, createPartner, updatePartner, updatePartnerStatus, deletePartner, currentUser } = useContext(AppContext);
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => partners
    .filter((p) => statusFilter === 'All' || p.status === statusFilter)
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [partners, statusFilter, searchTerm]);

  const openCreate = () => { setForm(emptyForm); setModalMode('create'); setError(''); };
  const openEdit = (p) => {
    setForm({
      name: p.name, partnershipType: p.partnershipType || '', contactName: p.contactName || '',
      email: p.email || '', phone: p.phone || '', responsibilities: p.responsibilities || '', agreementNotes: p.agreementNotes || ''
    });
    setEditingId(p.id);
    setModalMode('edit');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = modalMode === 'create' ? await createPartner(form) : await updatePartner(editingId, form);
    setSubmitting(false);
    if (res.success) setModalMode(null);
    else setError(res.error);
  };

  const handleDelete = async (p) => {
    const ok = await confirm({ title: 'Delete this partner?', message: `"${p.name}" will be permanently removed.`, confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deletePartner(p.id);
  };

  const handleApprove = (p) => updatePartnerStatus(p.id, 'Active');
  const handleReject = async (p) => {
    const ok = await confirm({ title: 'Reject this partnership?', confirmLabel: 'Reject', variant: 'warning' });
    if (ok) updatePartnerStatus(p.id, 'Rejected');
  };
  const handleEnd = async (p) => {
    const ok = await confirm({ title: 'End this partnership?', confirmLabel: 'End', variant: 'warning' });
    if (ok) updatePartnerStatus(p.id, 'Ended');
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Handshake size={26} className="text-indigo-600" /> Partners
          </h1>
          <p className="text-gray-600 mt-1">
            Partner organizations and the state of each relationship. New requests need Org Admin approval.
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
          <Plus size={18} /> Propose Partner
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Partners</p>
          <p className="text-3xl font-bold text-black mt-1">{partners.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{partners.filter((p) => p.status === 'Active').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{partners.filter((p) => p.status === 'Pending').length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Search size={20} className="text-gray-500" />
          <input type="text" placeholder="Search partners..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Pending', 'Active', 'Ended', 'Rejected'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">No partners match these filters.</div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-black">{p.name}</h3>
                {p.partnershipType && <p className="text-xs text-gray-500">{p.partnershipType}</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass(p.status)}`}>{p.status}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              {p.contactName && <p>{p.contactName}</p>}
              {p.email && <p>{p.email}</p>}
              {p.responsibilities && <p className="mt-1 text-gray-600">{p.responsibilities}</p>}
            </div>
            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100 flex-wrap">
              {currentUser?.role === 'OrgAdmin' && p.status === 'Pending' && (
                <>
                  <button onClick={() => handleApprove(p)} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => handleReject(p)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                    <Ban size={14} /> Reject
                  </button>
                </>
              )}
              {currentUser?.role === 'OrgAdmin' && p.status === 'Active' && (
                <button onClick={() => handleEnd(p)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
                  End Partnership
                </button>
              )}
              <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
                <Edit size={14} /> Edit
              </button>
              {currentUser?.role === 'OrgAdmin' && (
                <button onClick={() => handleDelete(p)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition ml-auto">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-black mb-4">{modalMode === 'create' ? 'Propose Partner' : 'Edit Partner'}</h2>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Organization Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Partnership Type</label>
                <input value={form.partnershipType} onChange={(e) => setForm({ ...form, partnershipType: e.target.value })} placeholder="e.g. Implementation Partner, Logistics" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Contact Name</label>
                  <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Responsibilities</label>
                <textarea value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Agreement Notes</label>
                <textarea value={form.agreementNotes} onChange={(e) => setForm({ ...form, agreementNotes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalMode(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Partners;
