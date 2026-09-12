import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Briefcase, Plus, Search, Edit, Trash2, Users as UsersIcon, X } from 'lucide-react';

const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Planning': return 'bg-blue-100 text-blue-700';
    case 'OnHold': return 'bg-amber-100 text-amber-700';
    case 'Completed': return 'bg-gray-200 text-gray-700';
    case 'Cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const emptyForm = { title: '', description: '', objectives: '', location: '', startDate: '', endDate: '', budget: '', status: 'Planning' };

const Projects = () => {
  const { projects, users, tasks, createProject, updateProject, deleteProject, getProjectTeam, addProjectTeamMember, removeProjectTeamMember, currentUser } = useContext(AppContext);
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [teamModalProject, setTeamModalProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamUserToAdd, setTeamUserToAdd] = useState('');
  const [teamRoleToAdd, setTeamRoleToAdd] = useState('');

  const filtered = useMemo(() => projects
    .filter((p) => statusFilter === 'All' || p.status === statusFilter)
    .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase())),
  [projects, statusFilter, searchTerm]);

  const taskCount = (projectId) => tasks.filter((t) => t.projectId === projectId).length;

  const openCreate = () => { setForm(emptyForm); setModalMode('create'); setError(''); };
  const openEdit = (p) => {
    setForm({
      title: p.title, description: p.description || '', objectives: p.objectives || '', location: p.location || '',
      startDate: p.startDate || '', endDate: p.endDate || '', budget: p.budget || '', status: p.status
    });
    setEditingId(p.id);
    setModalMode('edit');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = modalMode === 'create' ? await createProject(form) : await updateProject(editingId, form);
    setSubmitting(false);
    if (res.success) setModalMode(null);
    else setError(res.error);
  };

  const handleDelete = async (p) => {
    const ok = await confirm({ title: 'Delete this project?', message: `"${p.title}" and its team assignments will be permanently removed.`, confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteProject(p.id);
  };

  const openTeamModal = async (p) => {
    setTeamModalProject(p);
    setTeamUserToAdd('');
    setTeamRoleToAdd('');
    const res = await getProjectTeam(p.id);
    if (res.success) setTeamMembers(res.members);
  };
  const refreshTeam = async () => {
    const res = await getProjectTeam(teamModalProject.id);
    if (res.success) setTeamMembers(res.members);
  };
  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!teamUserToAdd) return;
    await addProjectTeamMember(teamModalProject.id, teamUserToAdd, teamRoleToAdd);
    setTeamUserToAdd('');
    setTeamRoleToAdd('');
    refreshTeam();
  };
  const handleRemoveTeamMember = async (userId) => {
    await removeProjectTeamMember(teamModalProject.id, userId);
    refreshTeam();
  };
  const userName = (id) => users.find((u) => u.id === id)?.fullName || 'Unknown';
  const availableUsersForTeam = users.filter((u) => !teamMembers.some((m) => m.userId === u.id));

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Briefcase size={26} className="text-indigo-600" /> Projects
          </h1>
          <p className="text-gray-600 mt-1">Plan, staff and track your organization's projects.</p>
        </div>
        {currentUser?.role === 'OrgAdmin' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all">
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Total Projects</p>
          <p className="text-3xl font-bold text-black mt-1">{projects.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Active</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{projects.filter((p) => p.status === 'Active').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{projects.filter((p) => p.status === 'Completed').length}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Search size={20} className="text-gray-500" />
          <input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">No projects match these filters.</div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-black text-lg">{p.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass(p.status)}`}>{p.status}</span>
            </div>
            {p.description && <p className="text-sm text-gray-600 line-clamp-3">{p.description}</p>}
            <div className="text-xs text-gray-500 space-y-1">
              {p.location && <p>📍 {p.location}</p>}
              {(p.startDate || p.endDate) && <p>🗓 {p.startDate || '—'} → {p.endDate || '—'}</p>}
              {p.budget && <p>💰 Budget: {Number(p.budget).toLocaleString()}</p>}
              <p>✅ {taskCount(p.id)} linked task{taskCount(p.id) === 1 ? '' : 's'}</p>
            </div>
            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
              <button onClick={() => openTeamModal(p)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition">
                <UsersIcon size={14} /> Team
              </button>
              {currentUser?.role === 'OrgAdmin' && (
                <>
                  <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(p)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition ml-auto">
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-black mb-4">{modalMode === 'create' ? 'New Project' : 'Edit Project'}</h2>
            {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Objectives</label>
                <textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Budget</label>
                  <input type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalMode(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {teamModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Team — {teamModalProject.title}</h2>
              <button onClick={() => setTeamModalProject(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="space-y-2 mb-4">
              {teamMembers.length === 0 && <p className="text-sm text-gray-400">No team members yet.</p>}
              {teamMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-black">{userName(m.userId)}</p>
                    {m.roleOnEntity && <p className="text-xs text-gray-500">{m.roleOnEntity}</p>}
                  </div>
                  {currentUser?.role === 'OrgAdmin' && (
                    <button onClick={() => handleRemoveTeamMember(m.userId)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>

            {currentUser?.role === 'OrgAdmin' && (
              <form onSubmit={handleAddTeamMember} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100">
                <select value={teamUserToAdd} onChange={(e) => setTeamUserToAdd(e.target.value)} required className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black">
                  <option value="">Select staff member...</option>
                  {availableUsersForTeam.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
                </select>
                <input value={teamRoleToAdd} onChange={(e) => setTeamRoleToAdd(e.target.value)} placeholder="Role (optional)" className="sm:w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black" />
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition">Add</button>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Projects;
