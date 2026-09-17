import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import AuditLogView from '../../shared/AuditLogView/AuditLogView';
import { History } from 'lucide-react';

const AuditLogs = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <History size={26} className="text-indigo-600" /> Audit Logs
          </h1>
          <p className="text-gray-600 mt-1">
            Platform wide record of who did what, when organization approvals, user status/role
            changes, access grants, and more.
          </p>
        </div>
      </div>

      <AuditLogView scope="platform" />
    </DashboardLayout>
  );
};

export default AuditLogs;
