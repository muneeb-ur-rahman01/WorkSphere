import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Wallet, Plus, Check, Ban, Trash2 } from 'lucide-react';

const emptyForm = { description: '', category: '', amount: '', projectId: '', campaignId: '', notes: '' };

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const Expenses = () => {
  const { expenses, projects, campaigns, createExpense, updateExpenseStatus, deleteExpense, currentUser } = useContext(AppContext);
  const confirm = useConfirm();

  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => expenses.filter((e) => statusFilter === 'All' || e.status === statusFilter), [expenses, statusFilter]);
  const projectTitle = (id) => projects.find((p) => p.id === id)?.title;
  const campaignTitle = (id) => campaigns.find((c) => c.id === id)?.title;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await createExpense(form);
    setSubmitting(false);
    if (res.success) { setModalOpen(false); setForm(emptyForm); }
    else setError(res.error);
  };

  const handleApprove = (exp) => updateExpenseStatus(exp.id, 'Approved');
  const handleReject = async (exp) => {
    const ok = await confirm({ title: 'Reject this expense?', confirmLabel: 'Reject', variant: 'warning' });
    if (ok) updateExpenseStatus(exp.id, 'Rejected');
  };
  const handleDelete = async (exp) => {
    const ok = await confirm({ title: 'Delete this expense record?', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteExpense(exp.id);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Wallet size={26} className="text-indigo-600" /> Expenses
          </h1>
          <p className="text-gray-600 mt-1">Project and campaign expenses, awaiting or reviewed by Org Admin approval.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setError(''); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
          <Plus size={18} /> Submit Expense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Expenses</p>
          <p className="text-3xl font-bold text-black mt-1">{expenses.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{expenses.filter((e) => e.status === 'Pending').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{expenses.filter((e) => e.status === 'Approved').reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-wrap gap-2">
        {['All', 'Pending', 'Approved', 'Rejected'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left text-black">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Linked To</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No expenses match this filter.</td></tr>
              )}
              {filtered.map((exp) => (
                <tr key={exp.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-black">{exp.description}</p>
                    {exp.category && <p className="text-xs text-gray-500">{exp.category}</p>}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {projectTitle(exp.projectId) && <p>Project: {projectTitle(exp.projectId)}</p>}
                    {campaignTitle(exp.campaignId) && <p>Campaign: {campaignTitle(exp.campaignId)}</p>}
                    {!exp.projectId && !exp.campaignId && '—'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-black">{Number(exp.amount).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(exp.status)}`}>{exp.status}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {currentUser?.role === 'OrgAdmin' && exp.status === 'Pending' && (
                        <>
                          <button onClick={() => handleApprove(exp)} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition" title="Approve"><Check size={16} /></button>
                          <button onClick={() => handleReject(exp)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" title="Reject"><Ban size={16} /></button>
                        </>
                      )}
                      {currentUser?.role === 'OrgAdmin' && (
                        <button onClick={() => handleDelete(exp)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition" title="Delete"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-4">Submit Expense</h2>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Description</label>
                <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Logistics" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Amount</label>
                  <input type="number" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Project</label>
                  <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">None</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Campaign</label>
                  <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">None</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Expenses;
