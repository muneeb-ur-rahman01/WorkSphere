import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Check, X, UserCheck, ClipboardList, Inbox } from 'lucide-react';
import { getRoleBadgeColor } from '../../../Config/constant';

const PendingRequests = () => {
  const { currentUser, users, updateStaffStatus, hasAccess } = useContext(AppContext);

  // Reachable by OrgAdmin always, or by a staff member who was granted the
  // 'registration_requests' Accessibility permission (see Accessibility.jsx).
  // Anyone else who lands here (e.g. a staff member without that grant) is
  // redirected back to their own dashboard.
  if (currentUser.role !== 'OrgAdmin' && !hasAccess('registration_requests')) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Filter requests that are Pending for this specific organization
  const pendingRequests = users.filter(u => u.orgId === currentUser.orgId && u.status === 'Pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">
              Pending Workspace Registrations
            </h1>
            <p className="mt-2 text-gray-600">
              Approve or reject incoming registration requests from employees,
              interns, volunteers, or members.
            </p>
          </div>

          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-2 font-semibold text-sm shrink-0">
              <Inbox size={16} />
              {pendingRequests.length} awaiting review
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">

          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-2.5 shadow-md">
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Applicant Queue</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Review credentials before granting workspace access.
              </p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="bg-gray-50 text-gray-300 rounded-full p-4">
                <Inbox size={32} />
              </div>
              <p className="text-gray-500">No pending registration requests right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((user) => {
                const badge = getRoleBadgeColor(user.role);

                return (
                  <div
                    key={user.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
                        <UserCheck size={18} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-black leading-tight">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge}`}>
                        {user.role}
                      </span>
                      <span className="text-xs text-gray-400">
                        Applied {user.createdAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <button
                        onClick={() => updateStaffStatus(user.id, 'Active')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5"
                      >
                        <Check size={16} />
                        Approve
                      </button>

                      <button
                        onClick={() => updateStaffStatus(user.id, 'Rejected')}
                        className="flex items-center gap-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-semibold px-4 py-2 rounded-lg border border-red-200 hover:border-red-600 transition-all"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PendingRequests;
