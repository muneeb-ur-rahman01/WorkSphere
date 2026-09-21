import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { HandHeart, Search, Edit } from 'lucide-react';

const emptyForm = { skills: '', interests: '', availability: '', totalHours: '', performanceNotes: '' };

const Volunteers = () => {
  const { volunteers, updateVolunteerProfile, currentUser, hasAccess } = useContext(AppContext);

  // Org Admins always can; staff need the 'volunteers' section granted under
  // Accessibility. (Approve / reject decisions stay Org-Admin-only.)
  const canManage = currentUser?.role === 'OrgAdmin' || hasAccess('volunteers');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => volunteers.filter((v) =>
    v.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || v.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [volunteers, searchTerm]);

  const openEdit = (v) => {
    setEditingVolunteer(v);
    setForm({
      skills: v.profile?.skills || '',
      interests: v.profile?.interests || '',
      availability: v.profile?.availability || '',
      totalHours: v.profile?.totalHours ?? '',
      performanceNotes: v.profile?.performanceNotes || ''
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await updateVolunteerProfile(editingVolunteer.id, form);
    setSubmitting(false);
    if (res.success) setEditingVolunteer(null);
    else setError(res.error);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <HandHeart size={26} className="text-indigo-600" /> Volunteers
        </h1>
        <p className="text-gray-600 mt-1">
          Skills, availability and logged hours for staff registered as Volunteers. Registration, approval
          and status changes happen under User &amp; Access Management.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Volunteers</p>
          <p className="text-3xl font-bold text-black mt-1">{volunteers.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Hours Logged</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{volunteers.reduce((sum, v) => sum + Number(v.profile?.totalHours || 0), 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{volunteers.filter((v) => v.status === 'Active').length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex items-center gap-3">
        <Search size={20} className="text-gray-500" />
        <input type="text" placeholder="Search volunteers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">
            No volunteers yet. Volunteers are added via User &amp; Access Management with the "Volunteer" role.
          </div>
        )}
        {filtered.map((v) => (
          <div key={v.id} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-black">{v.fullName}</h3>
                <p className="text-xs text-gray-500">{v.email}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 whitespace-nowrap">{v.status}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1 mt-1">
              <p><span className="font-semibold text-black">Skills:</span> {v.profile?.skills || '—'}</p>
              <p><span className="font-semibold text-black">Availability:</span> {v.profile?.availability || '—'}</p>
              <p><span className="font-semibold text-black">Hours logged:</span> {v.profile?.totalHours ?? 0}</p>
            </div>
            {canManage && (
              <button onClick={() => openEdit(v)} className="mt-2 self-start flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition">
                <Edit size={14} /> Edit Profile
              </button>
            )}
          </div>
        ))}
      </div>

      {editingVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-4">Volunteer Profile — {editingVolunteer.fullName}</h2>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Skills</label>
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. First aid, translation, logistics" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Interests</label>
                <input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Availability</label>
                <input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="e.g. Weekends, evenings" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Total Hours Logged</label>
                <input type="number" min="0" step="0.5" value={form.totalHours} onChange={(e) => setForm({ ...form, totalHours: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Performance Notes</label>
                <textarea value={form.performanceNotes} onChange={(e) => setForm({ ...form, performanceNotes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingVolunteer(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Volunteers;
