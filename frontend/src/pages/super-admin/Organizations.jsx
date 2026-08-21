import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useConfirm } from '../../shared/ConfirmDialog/ConfirmDialog';
import { Search, Building, Check, Ban, Trash, ShieldCheck } from 'lucide-react';

const Organizations = () => {
  const { organizations, updateOrgStatus, deleteOrganization, users } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const confirm = useConfirm();

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAdminEmail = (orgId) => {
    const admin = users.find(u => u.orgId === orgId && u.role === 'OrgAdmin');
    return admin ? admin.email : 'N/A';
  };

  return (
  <DashboardLayout>

    {/* Page Header */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-black">
          Manage NGO Workspaces
        </h1>

        <p className="text-gray-600 mt-1">
          Review, approve, activate, suspend, or decommission tenant accounts.
        </p>
      </div>
    </div>

    {/* Search Card */}
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6">
      <div className="flex items-center gap-3">

        <Search size={20} className="text-gray-500" />

        <input
          type="text"
          placeholder="Search by NGO name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white text-black placeholder-gray-400 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

      </div>
    </div>

    {/* Organizations Table */}
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">

      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-black">
          Registered Tenant Systems
        </h2>

        <p className="text-gray-600 text-sm mt-1">
          Complete registry of tenant SaaS databases
        </p>
      </div>

      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-6 py-4 text-left font-bold text-gray-700">
                Organization
              </th>

              <th className="px-6 py-4 text-left font-bold text-gray-700">
                Admin Email
              </th>

              <th className="px-6 py-4 text-left font-bold text-gray-700">
                Plan
              </th>

              <th className="px-6 py-4 text-left font-bold text-gray-700">
                Created Date
              </th>

              <th className="px-6 py-4 text-left font-bold text-gray-700">
                Status
              </th>

              <th className="px-6 py-4 text-left font-bold text-gray-700">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredOrgs.map((org) => {

              const statusClass =
                org.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : org.status === "Pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700";

              return (
                <tr
                  key={org.id}
                  className="border-t border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4">

                    <div className="flex items-center gap-3">

                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Building size={18} />
                      </div>

                      <div>

                        <p className="font-semibold text-black">
                          {org.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          ID: {org.id}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {getAdminEmail(org.id)}
                  </td>

                  <td className="px-6 py-4">

                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {org.subPlan}
                    </span>

                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {org.createdAt}
                  </td>

                  <td className="px-6 py-4">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}
                    >
                      {org.status}
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <div className="flex flex-wrap gap-2">
                                            {org.status === "Pending" && (
                        <button
                          onClick={() =>
                            updateOrgStatus(org.id, "Active")
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all duration-300"
                        >
                          <Check size={15} />
                          Approve
                        </button>
                      )}

                      {org.status === "Active" && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Suspend this organization?',
                              message: `"${org.name}" and all of its staff will lose access to the platform until reactivated. Their data will not be affected.`,
                              confirmLabel: 'Suspend',
                              variant: 'warning'
                            });
                            if (ok) updateOrgStatus(org.id, "Suspended");
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600 transition-all duration-300"
                        >
                          <Ban size={15} />
                          Suspend
                        </button>
                      )}

                      {org.status === "Suspended" && (
                        <button
                          onClick={() =>
                            updateOrgStatus(org.id, "Active")
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all duration-300"
                        >
                          <ShieldCheck size={15} />
                          Activate
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete this organization?',
                            message: `"${org.name}" and all of its associated data (staff, camps, events, tasks) will be permanently removed. This cannot be undone.`,
                            confirmLabel: 'Delete',
                            variant: 'danger'
                          });
                          if (ok) deleteOrganization(org.id);
                        }}
                        className="flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                      >
                        <Trash size={15} />
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

  </DashboardLayout>
);
};

export default Organizations;
