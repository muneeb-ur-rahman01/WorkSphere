import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { ShieldCheck, UserCog, CheckSquare, Square, ClipboardList, Calendar, CalendarDays, Layers } from 'lucide-react';
import { getRoleBadgeColor } from '../../../Config/constant';

// Icon per section key, purely cosmetic — falls back to a generic icon for
// any future section added to ASSIGNABLE_SECTIONS on the backend that
// doesn't have a specific one mapped here yet.
const SECTION_ICONS = {
  registration_requests: ClipboardList,
  camps: Calendar,
  events: CalendarDays
};

// Lets an OrgAdmin pick a staff member and grant/revoke access to specific
// dashboard sections (Registration Requests, Camps, Events). Built to
// scale — as more sections become permission-aware on the backend (see
// ASSIGNABLE_SECTIONS in backend/controllers/permissionController.js),
// they automatically show up here with no frontend change needed.
const Accessibility = () => {
  const { currentUser, users, getAssignableSections, getUserPermissions, grantPermission, revokePermission } = useContext(AppContext);

  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [grantedSections, setGrantedSections] = useState([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState(''); // section key currently being toggled
  const [error, setError] = useState('');

  const orgStaff = users.filter(u => u.orgId === currentUser.orgId && u.status === 'Active' && u.role !== 'OrgAdmin');

  useEffect(() => {
    const load = async () => {
      const res = await getAssignableSections();
      if (res.success) setSections(res.sections);
      setSectionsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setGrantedSections([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setPermsLoading(true);
      setError('');
      const res = await getUserPermissions(selectedUserId);
      if (!cancelled) {
        if (res.success) setGrantedSections(res.sections);
        else setError(res.error || 'Could not load access for this member.');
        setPermsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const toggleSection = async (sectionKey) => {
    if (!selectedUserId) return;
    setPendingKey(sectionKey);
    setError('');

    const isGranted = grantedSections.includes(sectionKey);
    const res = isGranted
      ? await revokePermission(selectedUserId, sectionKey)
      : await grantPermission(selectedUserId, sectionKey);

    if (res.success) {
      setGrantedSections(prev => isGranted ? prev.filter(k => k !== sectionKey) : [...prev, sectionKey]);
    } else {
      setError(res.error || 'Could not update access.');
    }
    setPendingKey('');
  };

  const selectedUser = orgStaff.find(u => u.id === selectedUserId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Accessibility</h1>
          <p className="mt-2 text-gray-600">
            Control which employees and staff members can access specific sections of your
            organization dashboard — beyond what their role shows by default.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 lg:col-span-1 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl p-2.5 shadow-md">
                <UserCog size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Select Staff Member</h2>
                <p className="text-xs text-gray-500 mt-0.5">Assign section access individually</p>
              </div>
            </div>

            {orgStaff.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No active staff members yet.</p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="">Choose a staff member...</option>
                {orgStaff.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} — {u.role}</option>
                ))}
              </select>
            )}

            {selectedUser && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(selectedUser.role)}`}>
                  {selectedUser.role}
                </span>
                <span className="text-sm text-gray-600">{selectedUser.email}</span>
                {!permsLoading && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    <Layers size={12} /> {grantedSections.length} granted
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section grants */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-emerald-100/40 p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-2.5 shadow-md">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Section Access</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedUser ? `Toggle which sections ${selectedUser.fullName} can access.` : 'Select a staff member to manage their access.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            {!selectedUserId ? (
              <div className="py-14 flex flex-col items-center gap-3 text-center text-gray-400">
                <div className="bg-gray-50 text-gray-300 rounded-full p-4">
                  <ShieldCheck size={28} />
                </div>
                <p>No staff member selected.</p>
              </div>
            ) : sectionsLoading || permsLoading ? (
              <div className="py-14 text-center text-gray-400">Loading…</div>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => {
                  const granted = grantedSections.includes(section.key);
                  const isPending = pendingKey === section.key;
                  const SectionIcon = SECTION_ICONS[section.key] || Layers;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      disabled={isPending}
                      className={`w-full flex items-start gap-3 text-left border rounded-xl p-4 transition-all ${
                        granted
                          ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      } disabled:opacity-60`}
                    >
                      <div className={`shrink-0 rounded-lg p-2 mt-0.5 ${granted ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        <SectionIcon size={16} />
                      </div>
                      {granted ? (
                        <CheckSquare size={20} className="text-indigo-600 shrink-0 mt-1.5" />
                      ) : (
                        <Square size={20} className="text-gray-400 shrink-0 mt-1.5" />
                      )}
                      <div>
                        <p className="font-semibold text-black">{section.label}</p>
                        {section.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                        )}
                        {granted && (
                          <p className="text-xs text-indigo-600 font-semibold mt-1">
                            Access granted — visible in their dashboard
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Accessibility;
