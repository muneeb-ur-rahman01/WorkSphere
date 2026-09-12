import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Gift, Plus, Search, Edit, Trash2, DollarSign, X } from 'lucide-react';

const STATUSES = ['Proposed', 'Active', 'Completed', 'Cancelled'];
const emptySponsorForm = { name: '', contactName: '', email: '', phone: '', notes: '' };
const emptySponsorshipForm = { packageName: '', amount: '', status: 'Proposed', startDate: '', endDate: '', projectId: '', campaignId: '', notes: '' };

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Proposed': return 'bg-blue-100 text-blue-700';
    case 'Completed': return 'bg-gray-200 text-gray-700';
    case 'Cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const Sponsors = () => {
  const { sponsors, sponsorships, projects, campaigns, createSponsor, updateSponsor, deleteSponsor, createSponsorship, updateSponsorship, deleteSponsorship, currentUser } = useContext(AppContext);
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptySponsorForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sponsorshipModalSponsor, setSponsorshipModalSponsor] = useState(null);
  const [sponsorshipForm, setSponsorshipForm] = useState(emptySponsorshipForm);
  const [sponsorshipError, setSponsorshipError] = useState('');

  const filtered = useMemo(() => sponsors.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [sponsors, searchTerm]);

  const sponsorSponsorships = (sponsorId) => sponsorships.filter((s) => s.sponsorId === sponsorId);

  const openCreate = () => { setForm(emptySponsorForm); setModalMode('create'); setError(''); };
  const openEdit = (s) => {
    setForm({ name: s.name, contactName: s.contactName || '', email: s.email || '', phone: s.phone || '', notes: s.notes || '' });
    setEditingId(s.id);
    setModalMode('edit');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = modalMode === 'create' ? await createSponsor(form) : await updateSponsor(editingId, form);
    setSubmitting(false);
    if (res.success) setModalMode(null);
    else setError(res.error);
  };

  const handleDelete = async (s) => {
    const ok = await confirm({ title: 'Delete this sponsor?', message: `"${s.name}" and their sponsorship history will be permanently removed.`, confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteSponsor(s.id);
  };

  const openSponsorshipModal = (s) => {
    setSponsorshipModalSponsor(s);
    setSponsorshipForm(emptySponsorshipForm);
    setSponsorshipError('');
  };

  const handleAddSponsorship = async (e) => {
    e.preventDefault();
    const res = await createSponsorship({ ...sponsorshipForm, sponsorId: sponsorshipModalSponsor.id });
    if (res.success) setSponsorshipForm(emptySponsorshipForm);
    else setSponsorshipError(res.error);
  };

  const handleSponsorshipStatus = (sp, status) => updateSponsorship(sp.id, { status });
  const handleDeleteSponsorship = async (sp) => {
    const ok = await confirm({ title: 'Delete this sponsorship record?', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteSponsorship(sp.id);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Gift size={26} className="text-indigo-600" /> Sponsors
          </h1>
          <p className="text-gray-600 mt-1">Sponsors, sponsorship packages, and which projects or campaigns they back.</p>
        </div>
        {currentUser?.role === 'OrgAdmin' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
            <Plus size={18} /> New Sponsor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Sponsors</p>
          <p className="text-3xl font-bold text-black mt-1">{sponsors.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Sponsorships</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{sponsorships.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Committed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{sponsorships.reduce((sum, s) => sum + Number(s.amount || 0), 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex items-center gap-3">
        <Search size={20} className="text-gray-500" />
        <input type="text" placeholder="Search sponsors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left text-black">
                <th className="px-6 py-3">Sponsor</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Total Committed</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No sponsors match this search.</td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50 align-top">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-black">{s.name}</p>
                    {sponsorSponsorships(s.id).length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{sponsorSponsorships(s.id).length} sponsorship{sponsorSponsorships(s.id).length === 1 ? '' : 's'}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {s.contactName && <p>{s.contactName}</p>}
                    {s.email && <p>{s.email}</p>}
                    {s.phone && <p>{s.phone}</p>}
                  </td>
                  <td className="px-6 py-4 font-semibold text-black">{Number(s.totalCommitted).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openSponsorshipModal(s)} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition" title="Sponsorships">
                        <DollarSign size={16} />
                      </button>
                      {currentUser?.role === 'OrgAdmin' && (
                        <>
                          <button onClick={() => openEdit(s)} className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition" title="Edit"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(s)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" title="Delete"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-4">{modalMode === 'create' ? 'New Sponsor' : 'Edit Sponsor'}</h2>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
                <label className="mb-1 block text-sm font-semibold text-black">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalMode(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Sponsor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sponsorshipModalSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Sponsorships — {sponsorshipModalSponsor.name}</h2>
              <button onClick={() => setSponsorshipModalSponsor(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
              {sponsorSponsorships(sponsorshipModalSponsor.id).length === 0 && <p className="text-sm text-gray-400">No sponsorships recorded yet.</p>}
              {sponsorSponsorships(sponsorshipModalSponsor.id).map((sp) => (
                <div key={sp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-black">{sp.packageName || 'Sponsorship'} {sp.amount ? `— ${Number(sp.amount).toLocaleString()}` : ''}</p>
                    <p className="text-xs text-gray-500">{sp.startDate || '—'} → {sp.endDate || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser?.role === 'OrgAdmin' ? (
                      <select value={sp.status} onChange={(e) => handleSponsorshipStatus(sp, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${statusBadgeClass(sp.status)}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(sp.status)}`}>{sp.status}</span>
                    )}
                    {currentUser?.role === 'OrgAdmin' && (
                      <button onClick={() => handleDeleteSponsorship(sp)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sponsorshipError && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{sponsorshipError}</div>}

            {currentUser?.role === 'OrgAdmin' && (
              <form onSubmit={handleAddSponsorship} className="space-y-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black">Package Name</label>
                    <input value={sponsorshipForm.packageName} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, packageName: e.target.value })} placeholder="e.g. Gold Tier" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black">Amount</label>
                    <input type="number" min="0" value={sponsorshipForm.amount} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, amount: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black">Linked Project</label>
                    <select value={sponsorshipForm.projectId} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, projectId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black">
                      <option value="">None</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black">Linked Campaign</label>
                    <select value={sponsorshipForm.campaignId} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, campaignId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black">
                      <option value="">None</option>
                      {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black">Start Date</label>
                    <input type="date" value={sponsorshipForm.startDate} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, startDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-black">End Date</label>
                    <input type="date" value={sponsorshipForm.endDate} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, endDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition">Add Sponsorship</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Sponsors;
