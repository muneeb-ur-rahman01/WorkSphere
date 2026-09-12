import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useConfirm } from '../../shared/ConfirmDialog/ConfirmDialog';
import { Search, Users as UsersIcon, ShieldCheck, UserCheck, UserX, Edit, Trash2 } from 'lucide-react';
import { STAFF_ROLES, getRoleBadgeColor } from '../../Config/constant';

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Suspended', 'Rejected'];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Suspended': return 'bg-red-100 text-red-700';
    case 'Rejected': return 'bg-gray-200 text-gray-600';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

const UserManagement = () => {
  const { users, organizations, updateStaffStatus, updateStaffRole, deleteStaff } = useContext(AppContext);
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newRole, setNewRole] = useState('Employee');
  const [roleError, setRoleError] = useState('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const orgName = (orgId) => organizations.find((o) => String(o.id) === String(orgId))?.name || 'Unassigned';

  // SuperAdmin accounts are platform operators, not organization personnel — excluded here.
  const platformUsers = useMemo(() => users.filter((u) => u.role !== 'SuperAdmin'), [users]);

  const filtered = useMemo(() => {
    return platformUsers
      .filter((u) => orgFilter === 'All' || String(u.orgId) === orgFilter)
      .filter((u) => statusFilter === 'All' || u.status === statusFilter)
      .filter((u) => roleFilter === 'All' || u.role === roleFilter)
      .filter((u) =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [platformUsers, orgFilter, statusFilter, roleFilter, searchTerm]);

  const openRoleModal = (user) => {
    setRoleModalUser(user);
    setNewRole(user.role);
    setRoleError('');
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleModalUser) return;
    setRoleSubmitting(true);
    setRoleError('');
    const res = await updateStaffRole(roleModalUser.id, newRole);
    setRoleSubmitting(false);
    if (res.success) setRoleModalUser(null);
    else setRoleError(res.error || 'Could not update role.');
  };

  const handleApprove = (user) => updateStaffStatus(user.id, 'Active');
  const handleSuspend = async (user) => {
    const ok = await confirm({
      title: 'Suspend this account?',
      message: `${user.fullName} will immediately lose access until reactivated.`,
      confirmLabel: 'Suspend',
      variant: 'warning'
    });
    if (ok) updateStaffStatus(user.id, 'Suspended');
  };
  const handleDelete = async (user) => {
    const ok = await confirm({
      title: 'Remove this account?',
      message: `${user.fullName} will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'danger'
    });
    if (ok) deleteStaff(user.id);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <UsersIcon size={26} className="text-indigo-600" /> User Management
          </h1>
          <p className="text-gray-600 mt-1">
            Every user across every organization on the platform — account status, role assignment
            and login activity.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Search size={20} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700">
          <option value="All">All organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={String(o.id)}>{o.name}</option>
          ))}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700">
          <option value="All">All roles</option>
          <option value="OrgAdmin">Organization Admin</option>
          {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left text-black">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Organization</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Last Login</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No users match these filters.</td></tr>
              )}
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-black">{user.fullName}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{orgName(user.orgId)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                      {user.role === 'OrgAdmin' ? 'Organization Admin' : user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs whitespace-nowrap">{formatDateTime(user.lastLoginAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {user.status === 'Pending' && (
                        <button
                          onClick={() => handleApprove(user)}
                          className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                          title="Approve"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      {user.status !== 'Suspended' && user.role !== 'OrgAdmin' && (
                        <button
                          onClick={() => openRoleModal(user)}
                          className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition"
                          title="Edit role"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {user.status === 'Active' && (
                        <button
                          onClick={() => handleSuspend(user)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                          title="Suspend"
                        >
                          <UserX size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl p-2.5 shadow-md">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">Edit Role</h2>
            </div>
            <p className="mb-5 text-sm text-gray-500">
              Update the role for <strong>{roleModalUser.fullName}</strong> ({orgName(roleModalUser.orgId)}).
            </p>

            {roleError && (
              <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-5">{roleError}</div>
            )}

            <form onSubmit={handleSaveRole}>
              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-black">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setRoleModalUser(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">
                  Cancel
                </button>
                <button type="submit" disabled={roleSubmitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                  {roleSubmitting ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default UserManagement;
