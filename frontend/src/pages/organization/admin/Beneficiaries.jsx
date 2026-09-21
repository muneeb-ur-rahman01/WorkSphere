import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Heart, Plus, Search, Edit, Trash2, FolderPlus, X } from 'lucide-react';

const emptyForm = { name: '', contactInfo: '', demographicNotes: '' };

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Completed': return 'bg-gray-200 text-gray-700';
    case 'Dropped': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const Beneficiaries = () => {
  const { beneficiaries, enrollments, projects, createBeneficiary, updateBeneficiary, deleteBeneficiary, createEnrollment, updateEnrollment, deleteEnrollment, currentUser, hasAccess } = useContext(AppContext);

  // Org Admins always can; staff need the 'beneficiaries' section granted under
  // Accessibility. (Approve / reject decisions stay Org-Admin-only.)
  const canManage = currentUser?.role === 'OrgAdmin' || hasAccess('beneficiaries');
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [enrollModalBeneficiary, setEnrollModalBeneficiary] = useState(null);
  const [projectToEnroll, setProjectToEnroll] = useState('');

  const filtered = useMemo(() => beneficiaries.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [beneficiaries, searchTerm]);

  const beneficiaryEnrollments = (id) => enrollments.filter((e) => e.beneficiaryId === id);
  const projectTitle = (id) => projects.find((p) => p.id === id)?.title || 'Unknown project';

  const openCreate = () => { setForm(emptyForm); setModalMode('create'); setError(''); };
  const openEdit = (b) => {
    setForm({ name: b.name, contactInfo: b.contactInfo || '', demographicNotes: b.demographicNotes || '' });
    setEditingId(b.id);
    setModalMode('edit');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = modalMode === 'create' ? await createBeneficiary(form) : await updateBeneficiary(editingId, form);
    setSubmitting(false);
    if (res.success) setModalMode(null);
    else setError(res.error);
  };

  const handleDelete = async (b) => {
    const ok = await confirm({ title: 'Delete this beneficiary?', message: `"${b.name}" and their enrollment history will be permanently removed.`, confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteBeneficiary(b.id);
  };

  const openEnrollModal = (b) => { setEnrollModalBeneficiary(b); setProjectToEnroll(''); };
  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!projectToEnroll) return;
    await createEnrollment({ beneficiaryId: enrollModalBeneficiary.id, projectId: projectToEnroll });
    setProjectToEnroll('');
  };
  const handleEnrollmentStatus = (enr, status) => updateEnrollment(enr.id, { status });
  const handleRemoveEnrollment = async (enr) => {
    const ok = await confirm({ title: 'Remove this enrollment?', confirmLabel: 'Remove', variant: 'danger' });
    if (ok) deleteEnrollment(enr.id);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Heart size={26} className="text-indigo-600" /> Beneficiaries
          </h1>
          <p className="text-gray-600 mt-1">Registered beneficiaries and their program enrollment.</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
            <Plus size={18} /> Register Beneficiary
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Beneficiaries</p>
          <p className="text-3xl font-bold text-black mt-1">{beneficiaries.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Active Enrollments</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{enrollments.filter((e) => e.status === 'Active').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{enrollments.filter((e) => e.status === 'Completed').length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex items-center gap-3">
        <Search size={20} className="text-gray-500" />
        <input type="text" placeholder="Search beneficiaries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">No beneficiaries match this search.</div>
        )}
        {filtered.map((b) => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-2">
            <h3 className="font-bold text-black">{b.name}</h3>
            {b.contactInfo && <p className="text-xs text-gray-500">{b.contactInfo}</p>}
            {b.demographicNotes && <p className="text-xs text-gray-500">{b.demographicNotes}</p>}
            <div className="mt-1 space-y-1">
              {beneficiaryEnrollments(b.id).length === 0 && <p className="text-xs text-gray-400">Not enrolled in any project yet.</p>}
              {beneficiaryEnrollments(b.id).map((enr) => (
                <div key={enr.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-700">{projectTitle(enr.projectId)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(enr.status)}`}>{enr.status}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
              <button onClick={() => openEnrollModal(b)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition">
                <FolderPlus size={14} /> Enrollment
              </button>
              {canManage && (
                <>
                  <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(b)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition ml-auto">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-4">{modalMode === 'create' ? 'Register Beneficiary' : 'Edit Beneficiary'}</h2>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Contact Info</label>
                <input value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Notes</label>
                <textarea value={form.demographicNotes} onChange={(e) => setForm({ ...form, demographicNotes: e.target.value })} rows={2} placeholder="Any relevant background — kept as free text." className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalMode(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {enrollModalBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Enrollment — {enrollModalBeneficiary.name}</h2>
              <button onClick={() => setEnrollModalBeneficiary(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="space-y-2 mb-5">
              {beneficiaryEnrollments(enrollModalBeneficiary.id).map((enr) => (
                <div key={enr.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <span className="text-sm text-black">{projectTitle(enr.projectId)}</span>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <select value={enr.status} onChange={(e) => handleEnrollmentStatus(enr, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${statusBadgeClass(enr.status)}`}>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Dropped">Dropped</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(enr.status)}`}>{enr.status}</span>
                    )}
                    {canManage && (
                      <button onClick={() => handleRemoveEnrollment(enr)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canManage && (
              <form onSubmit={handleEnroll} className="flex gap-2 pt-3 border-t border-gray-100">
                <select value={projectToEnroll} onChange={(e) => setProjectToEnroll(e.target.value)} required className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black">
                  <option value="">Select project...</option>
                  {projects.filter((p) => !beneficiaryEnrollments(enrollModalBeneficiary.id).some((e) => e.projectId === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition">Enroll</button>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Beneficiaries;
