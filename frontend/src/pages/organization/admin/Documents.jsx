import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { FileText, Plus, Check, Ban, Trash2, ExternalLink } from 'lucide-react';

const emptyForm = { title: '', category: '', fileUrl: '', expiryDate: '' };

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const Documents = () => {
  const { documents, createDocument, updateDocumentStatus, deleteDocument, currentUser } = useContext(AppContext);
  const confirm = useConfirm();

  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => documents.filter((d) => statusFilter === 'All' || d.status === statusFilter), [documents, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await createDocument(form);
    setSubmitting(false);
    if (res.success) { setModalOpen(false); setForm(emptyForm); }
    else setError(res.error);
  };

  const handleApprove = (doc) => updateDocumentStatus(doc.id, 'Approved');
  const handleReject = async (doc) => {
    const ok = await confirm({ title: 'Reject this document?', confirmLabel: 'Reject', variant: 'warning' });
    if (ok) updateDocumentStatus(doc.id, 'Rejected');
  };
  const handleDelete = async (doc) => {
    const ok = await confirm({ title: 'Delete this document?', message: `"${doc.title}" will be permanently removed.`, confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteDocument(doc.id);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <FileText size={26} className="text-indigo-600" /> Documents
          </h1>
          <p className="text-gray-600 mt-1">
            Organization documents by link — agreements, policies, certificates. Staff uploads need Org Admin approval.
          </p>
        </div>
        <button onClick={() => { setForm(emptyForm); setError(''); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
          <Plus size={18} /> Add Document
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Documents</p>
          <p className="text-3xl font-bold text-black mt-1">{documents.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{documents.filter((d) => d.status === 'Pending').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{documents.filter((d) => d.status === 'Approved').length}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">No documents match this filter.</div>
        )}
        {filtered.map((doc) => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-black">{doc.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass(doc.status)}`}>{doc.status}</span>
            </div>
            {doc.category && <p className="text-xs text-gray-500">{doc.category}</p>}
            {doc.expiryDate && <p className="text-xs text-gray-500">Expires: {doc.expiryDate}</p>}
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline mt-1">
              <ExternalLink size={13} /> Open document
            </a>
            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
              {currentUser?.role === 'OrgAdmin' && doc.status === 'Pending' && (
                <>
                  <button onClick={() => handleApprove(doc)} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition" title="Approve"><Check size={16} /></button>
                  <button onClick={() => handleReject(doc)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" title="Reject"><Ban size={16} /></button>
                </>
              )}
              {currentUser?.role === 'OrgAdmin' && (
                <button onClick={() => handleDelete(doc)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition ml-auto" title="Delete"><Trash2 size={16} /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-4">Add Document</h2>
            <p className="text-xs text-gray-500 mb-4">Link to a file hosted elsewhere (Google Drive, Dropbox, etc.) WorkSphere doesn't store the file itself.</p>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">File URL</label>
                <input required type="url" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Agreement" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Documents;
