import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { ShieldCheck, UserCog, CheckSquare, Square, ClipboardList, Calendar, CalendarDays, Video, Layers, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { getRoleBadgeColor } from '../../../Config/constant';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';

// Icon per section key, purely cosmetic — falls back to a generic icon for
// any future section added to ASSIGNABLE_SECTIONS on the backend that
// doesn't have a specific one mapped here yet.
const SECTION_ICONS = {
  registration_requests: ClipboardList,
  camps: Calendar,
  events: CalendarDays,
  meetings: Video
};

// Lets an OrgAdmin pick a staff member and grant/revoke access to specific
// dashboard sections (Registration Requests, Camps, Events). Built to
// scale — as more sections become permission-aware on the backend (see
// ASSIGNABLE_SECTIONS in backend/controllers/permissionController.js),
// they automatically show up here with no frontend change needed.
const Accessibility = () => {
  const { currentUser, users, getAssignableSections, getUserPermissions, setUserPermissions } = useContext(AppContext);

  const confirm = useConfirm();

  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState('');
  // grantedSections = what is saved on the server.
  // draftSections   = what the checkboxes currently show. Ticking a box only
  //                   changes the draft - nothing is granted or removed until
  //                   the admin presses "Save Changes".
  const [grantedSections, setGrantedSections] = useState([]);
  const [draftSections, setDraftSections] = useState([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const sameSet = (a, b) => a.length === b.length && a.every((k) => b.includes(k));
  const hasChanges = !sameSet(grantedSections, draftSections);

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
      setDraftSections([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setPermsLoading(true);
      setError('');
      setSaved('');
      const res = await getUserPermissions(selectedUserId);
      if (!cancelled) {
        if (res.success) {
          setGrantedSections(res.sections);
          setDraftSections(res.sections);
        } else {
          setError(res.error || 'Could not load access for this member.');
        }
        setPermsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  // Only edits the draft - nothing is sent to the server yet.
  const toggleSection = (sectionKey) => {
    if (!selectedUserId || saving) return;
    setError('');
    setSaved('');
    setDraftSections(prev =>
      prev.includes(sectionKey) ? prev.filter(k => k !== sectionKey) : [...prev, sectionKey]
    );
  };

  const handleDiscard = () => {
    setDraftSections(grantedSections);
    setError('');
    setSaved('');
  };

  const handleSave = async () => {
    if (!selectedUserId || !hasChanges) return;

    setSaving(true);
    setError('');
    setSaved('');

    const res = await setUserPermissions(selectedUserId, draftSections);

    setSaving(false);

    if (res.success) {
      setGrantedSections(draftSections);
      const parts = [];
      if (res.granted.length) parts.push(`${res.granted.length} granted`);
      if (res.revoked.length) parts.push(`${res.revoked.length} removed`);
      setSaved(`Access saved${parts.length ? ` (${parts.join(', ')})` : ''}.`);
    } else {
      setError(res.error || 'Could not save access.');
    }
  };

  // Switching to another staff member with unsaved ticks would silently lose them.
  const handleSelectUser = async (nextId) => {
    if (hasChanges) {
      const ok = await confirm({
        title: 'Discard unsaved changes?',
        message: 'You ticked or unticked sections but did not press "Save Changes". Switching member will discard them.',
        confirmLabel: 'Discard',
        variant: 'warning'
      });
      if (!ok) return;
    }
    setSelectedUserId(nextId);
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
                onChange={(e) => handleSelectUser(e.target.value)}
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
                    <Layers size={12} /> {grantedSections.length} granted{hasChanges ? ' · unsaved changes' : ''}
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
                  {selectedUser ? `Tick the sections ${selectedUser.fullName} should access, then press Save Changes.` : 'Select a staff member to manage their access.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            {saved && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} /> {saved}
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
                  const granted = draftSections.includes(section.key);
                  const isPending = saving;
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
                            {grantedSections.includes(section.key)
                              ? 'Access granted — visible in their dashboard'
                              : 'Will be granted when you save'}
                          </p>
                        )}
                        {!granted && grantedSections.includes(section.key) && (
                          <p className="text-xs text-amber-600 font-semibold mt-1">
                            Will be removed when you save
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Save / Discard */}
                <div className="sticky bottom-0 -mx-2 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
                  <p className={`text-sm font-medium ${hasChanges ? 'text-amber-600' : 'text-gray-400'}`}>
                    {hasChanges ? 'You have unsaved changes.' : 'No changes to save.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={!hasChanges || saving}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw size={15} /> Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!hasChanges || saving}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Accessibility;
