import React, { useContext, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Search, UserCheck, GraduationCap, Edit, UserMinus, UserPlus, ShieldCheck } from 'lucide-react';
import { STAFF_ROLES, getRoleBadgeColor } from '../../../Config/constant';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';

const OrgUsers = () => {
  const { currentUser, users, updateStaffStatus, updateStaffRole, deleteStaff, assignMentor, createStaffByAdmin } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const confirm = useConfirm();

  // Edit Role modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('Employee');
  const [roleError, setRoleError] = useState('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const handleOpenRoleModal = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
    setRoleError('');
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setRoleSubmitting(true);
    setRoleError('');
    const res = await updateStaffRole(editingUser.id, newRole);
    setRoleSubmitting(false);
    if (res.success) {
      setRoleModalOpen(false);
      setEditingUser(null);
    } else {
      setRoleError(res.error || 'Could not update role.');
    }
  };
  
  // Mentor modal states
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [selectedInternId, setSelectedInternId] = useState(null);
  const [mentorName, setMentorName] = useState('');

  // Add Staff modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '', role: 'Employee' });
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  const handleAddChange = (e) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addForm.fullName || !addForm.email || !addForm.password) {
      setAddError('Please fill in all fields.');
      return;
    }
    if (addForm.password.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    setAddSubmitting(true);
    const res = await createStaffByAdmin(addForm.fullName, addForm.email, addForm.password, addForm.role);
    setAddSubmitting(false);

    if (res.success) {
      setAddModalOpen(false);
      setAddForm({ fullName: '', email: '', password: '', role: 'Employee' });
    } else {
      setAddError(res.error || 'Could not add staff member.');
    }
  };

  // Filter out pending and non-org users, and exclude the admin himself
  const orgStaff = users.filter(u => 
    u.orgId === currentUser.orgId && 
    u.status === 'Active' && 
    u.role !== 'OrgAdmin'
  );

  const filteredStaff = orgStaff.filter(u =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Available admins to mentor interns
  const potentialMentors = users.filter(u => u.orgId === currentUser.orgId && u.role === 'OrgAdmin').map(u => u.fullName);

  const handleOpenMentorModal = (internId, currentMentor) => {
    setSelectedInternId(internId);
    setMentorName(currentMentor || '');
    setMentorModalOpen(true);
  };

  const handleSaveMentor = (e) => {
    e.preventDefault();
    if (selectedInternId && mentorName) {
      assignMentor(selectedInternId, mentorName);
      setMentorModalOpen(false);
      setSelectedInternId(null);
      setMentorName('');
    }
  };

return (
  <DashboardLayout>
    {/* Header */}
    <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-bold text-black">
          Manage Staff & Personnel
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Deactivate members, check profiles, and assign mentors for interns.
        </p>
      </div>

      <button
        onClick={() => setAddModalOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg transition"
      >
        <UserPlus size={18} />
        Add Personnel
      </button>
    </div>

    {/* Search */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-3">
        <Search size={18} className="text-gray-500" />

        <input
          type="text"
          placeholder="Search by personnel name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    {/* Staff Table */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-xl font-bold text-black">
          NGO Personnel Registry
        </h2>
        <p className="text-sm text-gray-500">
          Active employees, interns, volunteers, members & directors
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="text-left text-black">
              <th className="px-6 py-3">Full Name</th>
              <th className="px-6 py-3">Email Address</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Assigned Mentor</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStaff.map((user) => {
              const roleColor = getRoleBadgeColor(user.role);
                                return (
                <tr
                  key={user.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <UserCheck size={16} />
                      </div>

                      <span className="font-semibold text-black">
                        {user.fullName}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {user.email}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${roleColor}`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {user.role === "Intern" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">
                          {user.assignedMentor || "Unassigned"}
                        </span>

                        <button
                          onClick={() =>
                            handleOpenMentorModal(
                              user.id,
                              user.assignedMentor
                            )
                          }
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                      {user.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenRoleModal(user)}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition"
                        title="Edit role"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Deactivate this member?',
                            message: `${user.fullName} will lose access to the organization until reactivated. Their data will not be affected.`,
                            confirmLabel: 'Deactivate',
                            variant: 'warning'
                          });
                          if (ok) updateStaffStatus(user.id, "Suspended");
                        }}
                        className="px-4 py-2 rounded-lg border border-red-300 text-red-600 font-bold hover:bg-red-50 transition"
                      >
                        Deactivate
                      </button>

                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Remove this member?',
                            message: `${user.fullName} will be permanently removed from the organization roster. This cannot be undone.`,
                            confirmLabel: 'Remove',
                            variant: 'danger'
                          });
                          if (ok) deleteStaff(user.id);
                        }}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
        {/* Mentor Assignment Modal */}
    {mentorModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-5 text-xl font-bold text-black">
            Assign Intern Mentor
          </h2>

          <form onSubmit={handleSaveMentor}>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-black">
                Select Mentor (Org Admin)
              </label>

              <select
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select mentor...</option>

                {potentialMentors.map((mentor) => (
                  <option key={mentor} value={mentor}>
                    {mentor}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMentorModalOpen(false)}
                className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 transition"
              >
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit Role Modal */}
    {roleModalOpen && editingUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl p-2.5 shadow-md">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-xl font-bold text-black">
              Edit Role
            </h2>
          </div>
          <p className="mb-5 text-sm text-gray-500">
            Update the role for <strong>{editingUser.fullName}</strong>. This is reflected everywhere
            their role is used, including any section-access permissions tied to it.
          </p>

          {roleError && (
            <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-5">
              {roleError}
            </div>
          )}

          <form onSubmit={handleSaveRole}>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-black">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRoleModalOpen(false);
                  setEditingUser(null);
                }}
                className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={roleSubmitting}
                className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {roleSubmitting ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Add Staff Modal */}
    {addModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-xl font-bold text-black">
            Add New Personnel
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Account is created and activated immediately. The member can change this password later from their own Settings page.
          </p>

          {addError && (
            <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-5">
              {addError}
            </div>
          )}

          <form onSubmit={handleAddStaff}>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-black">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={addForm.fullName}
                onChange={handleAddChange}
                placeholder="e.g. Ayesha Raza"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-black">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={addForm.email}
                onChange={handleAddChange}
                placeholder="e.g. ayesha@ghf.org"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-black">
                Set Password
              </label>
              <input
                type="password"
                name="password"
                value={addForm.password}
                onChange={handleAddChange}
                placeholder="Minimum 6 characters"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-black">
                Role
              </label>
              <select
                name="role"
                value={addForm.role}
                onChange={handleAddChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  setAddError('');
                  setAddForm({ fullName: '', email: '', password: '', role: 'Employee' });
                }}
                className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={addSubmitting}
                className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {addSubmitting ? 'Adding...' : 'Add & Activate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </DashboardLayout>
);
};

export default OrgUsers;
