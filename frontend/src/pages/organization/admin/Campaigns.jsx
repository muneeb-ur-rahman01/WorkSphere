import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import {
  Megaphone,
  Plus,
  Search,
  Edit,
  Trash2,
  Users as UsersIcon,
  X,
  CheckCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const STATUSES = ['Planning', 'Active', 'Completed', 'Cancelled'];
const TYPES = ['Fundraising', 'Awareness', 'Outreach', 'Other'];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-700';
    case 'Planning':
      return 'bg-blue-100 text-blue-700';
    case 'Completed':
      return 'bg-gray-200 text-gray-700';
    case 'Cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const emptyForm = {
  title: '',
  description: '',
  objective: '',
  campaignType: 'Fundraising',
  startDate: '',
  endDate: '',
  goalAmount: '',
  status: 'Planning'
};

const Campaigns = () => {
  const {
    campaigns,
    users,
    tasks,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignTeam,
    addCampaignTeamMember,
    removeCampaignTeamMember,
    currentUser, hasAccess } = useContext(AppContext);

  // Org Admins always can; staff need the 'campaigns' section granted under
  // Accessibility. (Approve / reject decisions stay Org-Admin-only.)
  const canManage = currentUser?.role === 'OrgAdmin' || hasAccess('campaigns');

  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ============================================================
  // TOAST
  // ============================================================

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: '',
        type: 'success'
      });
    }, 3000);
  };

  // ============================================================
  // CUSTOM CALENDAR
  // ============================================================

  const [calendarOpen, setCalendarOpen] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatSelectedDate = (dateValue) => {
    if (!dateValue) {
      return 'Select date';
    }

    const date = new Date(
      `${dateValue}T00:00:00`
    );

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const openCalendar = (type) => {
    const currentValue =
      type === 'start'
        ? form.startDate
        : form.endDate;

    if (currentValue) {
      const selectedDate = new Date(
        `${currentValue}T00:00:00`
      );

      setCalendarMonth(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
      );
    } else {
      setCalendarMonth(new Date());
    }

    setCalendarOpen(
      calendarOpen === type ? null : type
    );
  };

  const selectCalendarDate = (date, type) => {
    const selectedDate =
      formatDateForInput(date);

    setForm((prev) => ({
      ...prev,
      [type === 'start'
        ? 'startDate'
        : 'endDate']: selectedDate
    }));

    setCalendarOpen(null);
  };

  const goToPreviousMonth = () => {
    setCalendarMonth(
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setCalendarMonth(
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = (type) => {
    const today = new Date();

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setForm((prev) => ({
      ...prev,
      [type === 'start'
        ? 'startDate'
        : 'endDate']: formatDateForInput(today)
    }));

    setCalendarOpen(null);
  };

  const isToday = (date) => {
    const today = new Date();

    return (
      date &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSelectedDate = (date, type) => {
    if (!date) return false;

    const value =
      type === 'start'
        ? form.startDate
        : form.endDate;

    return (
      value &&
      formatDateForInput(date) === value
    );
  };

  const calendarDays = getCalendarDays();

  const monthTitle =
    calendarMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

  // ============================================================
  // EXISTING LOGIC
  // ============================================================

  const [teamModalCampaign, setTeamModalCampaign] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamUserToAdd, setTeamUserToAdd] = useState('');
  const [teamRoleToAdd, setTeamRoleToAdd] = useState('');

  const filtered = useMemo(
    () =>
      campaigns
        .filter(
          (c) =>
            statusFilter === 'All' ||
            c.status === statusFilter
        )
        .filter((c) =>
          c.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ),
    [campaigns, statusFilter, searchTerm]
  );

  const taskCount = (campaignId) =>
    tasks.filter(
      (t) => t.campaignId === campaignId
    ).length;

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode('create');
    setError('');
    setCalendarOpen(null);
    setCalendarMonth(new Date());
  };

  const openEdit = (c) => {
    setForm({
      title: c.title,
      description: c.description || '',
      objective: c.objective || '',
      campaignType: c.campaignType,
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      goalAmount: c.goalAmount || '',
      status: c.status
    });

    setEditingId(c.id);
    setModalMode('edit');
    setError('');
    setCalendarOpen(null);

    if (c.startDate) {
      const date = new Date(
        `${c.startDate}T00:00:00`
      );

      setCalendarMonth(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        )
      );
    } else {
      setCalendarMonth(new Date());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setError('');

    const res =
      modalMode === 'create'
        ? await createCampaign(form)
        : await updateCampaign(
            editingId,
            form
          );

    setSubmitting(false);

    if (res.success) {
      setModalMode(null);
      setCalendarOpen(null);

      // ONLY CREATE = SUCCESS TOAST
      if (modalMode === 'create') {
        showToast('Success', 'success');
      }
    } else {
      setError(res.error);
    }
  };

  const handleDelete = async (c) => {
    const ok = await confirm({
      title: 'Delete this campaign?',
      message: `"${c.title}" and its team assignments will be permanently removed.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (ok) {
      const res = await deleteCampaign(c.id);

      if (res?.success !== false) {
        showToast('Deleted', 'error');
      }
    }
  };

  const openTeamModal = async (c) => {
    setTeamModalCampaign(c);
    setTeamUserToAdd('');
    setTeamRoleToAdd('');

    const res =
      await getCampaignTeam(c.id);

    if (res.success) {
      setTeamMembers(res.members);
    }
  };

  const refreshTeam = async () => {
    const res =
      await getCampaignTeam(
        teamModalCampaign.id
      );

    if (res.success) {
      setTeamMembers(res.members);
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();

    if (!teamUserToAdd) return;

    await addCampaignTeamMember(
      teamModalCampaign.id,
      teamUserToAdd,
      teamRoleToAdd
    );

    setTeamUserToAdd('');
    setTeamRoleToAdd('');

    refreshTeam();
  };

  const handleRemoveTeamMember = async (
    userId
  ) => {
    await removeCampaignTeamMember(
      teamModalCampaign.id,
      userId
    );

    refreshTeam();
  };

  const userName = (id) =>
    users.find(
      (u) => u.id === id
    )?.fullName || 'Unknown';

  const availableUsersForTeam =
    users.filter(
      (u) =>
        !teamMembers.some(
          (m) => m.userId === u.id
        )
    );

  return (
    <DashboardLayout>

      {/* ========================================================
          TOAST
      ======================================================== */}

      {toast.show && (
        <div className="fixed top-6 right-6 z-[9999]">
          <div
            className={`flex items-center gap-3 bg-white shadow-2xl rounded-xl px-5 py-4 min-w-[230px] border ${
              toast.type === 'error'
                ? 'border-red-200'
                : 'border-green-200'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                toast.type === 'error'
                  ? 'bg-red-100'
                  : 'bg-green-100'
              }`}
            >
              <CheckCircle
                size={21}
                className={
                  toast.type === 'error'
                    ? 'text-red-600'
                    : 'text-green-600'
                }
              />
            </div>

            <div>
              <p className="font-bold text-gray-900">
                {toast.message}
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                {toast.type === 'error'
                  ? 'Campaign deleted successfully'
                  : 'Campaign created successfully'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Megaphone
              size={26}
              className="text-indigo-600"
            />
            Campaigns
          </h1>

          <p className="text-gray-600 mt-1">
            Run fundraising, awareness and outreach campaigns.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus size={18} />
            New Campaign
          </button>
        )}
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Campaigns
          </p>

          <p className="text-3xl font-bold text-black mt-1">
            {campaigns.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Active
          </p>

          <p className="text-3xl font-bold text-blue-600 mt-1">
            {
              campaigns.filter(
                (c) => c.status === 'Active'
              ).length
            }
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Raised
          </p>

          <p className="text-3xl font-bold text-green-600 mt-1">
            {campaigns
              .reduce(
                (sum, c) =>
                  sum +
                  Number(
                    c.raisedAmount || 0
                  ),
                0
              )
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* SEARCH */}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Search
            size={20}
            className="text-gray-500"
          />

          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['All', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() =>
                setStatusFilter(s)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* CAMPAIGN CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">
            No campaigns match these filters.
          </div>
        )}

        {filtered.map((c) => {
          const progressPct = c.goalAmount
            ? Math.min(
                100,
                Math.round(
                  (c.raisedAmount /
                    c.goalAmount) *
                    100
                )
              )
            : null;

          return (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-black text-lg">
                    {c.title}
                  </h3>

                  <span className="text-xs text-gray-500">
                    {c.campaignType}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass(
                    c.status
                  )}`}
                >
                  {c.status}
                </span>
              </div>

              {c.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {c.description}
                </p>
              )}

              {c.goalAmount ? (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>
                      Raised:{' '}
                      {Number(
                        c.raisedAmount
                      ).toLocaleString()}
                    </span>

                    <span>
                      Goal:{' '}
                      {Number(
                        c.goalAmount
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                      style={{
                        width: `${progressPct}%`
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Raised so far:{' '}
                  {Number(
                    c.raisedAmount
                  ).toLocaleString()}
                </p>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                {(c.startDate ||
                  c.endDate) && (
                  <p>
                    🗓 {c.startDate || '—'} →{' '}
                    {c.endDate || '—'}
                  </p>
                )}

                <p>
                  ✅ {taskCount(c.id)} linked task
                  {taskCount(c.id) === 1
                    ? ''
                    : 's'}
                </p>
              </div>

              <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() =>
                    openTeamModal(c)
                  }
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition"
                >
                  <UsersIcon size={14} />
                  Team
                </button>

                {canManage && (
                  <>
                    <button
                      onClick={() =>
                        openEdit(c)
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                    >
                      <Edit size={14} />
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(c)
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold text-black mb-4">
              {modalMode === 'create'
                ? 'New Campaign'
                : 'Edit Campaign'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* TITLE */}

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Title
                </label>

                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title:
                        e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target.value
                    })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* OBJECTIVE */}

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Objective
                </label>

                <textarea
                  value={form.objective}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      objective:
                        e.target.value
                    })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* TYPE / GOAL */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Type
                  </label>

                  <select
                    value={
                      form.campaignType
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        campaignType:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TYPES.map((t) => (
                      <option
                        key={t}
                        value={t}
                      >
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Goal Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.goalAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        goalAmount:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* ==================================================
                  MODERN CALENDARS
              ================================================== */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* START DATE */}

                <div className="relative">
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Start Date
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      openCalendar('start')
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white transition-all ${
                      calendarOpen ===
                      'start'
                        ? 'border-indigo-500 ring-4 ring-indigo-100'
                        : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md">
                      <CalendarDays
                        size={19}
                      />
                    </div>

                    <div className="text-left min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.15em] font-extrabold text-gray-400">
                        Start Date
                      </p>

                      <p
                        className={`text-xs font-bold mt-0.5 truncate ${
                          form.startDate
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatSelectedDate(
                          form.startDate
                        )}
                      </p>
                    </div>

                    <ChevronRight
                      size={17}
                      className={`ml-auto shrink-0 text-gray-400 transition-transform ${
                        calendarOpen ===
                        'start'
                          ? 'rotate-90 text-indigo-600'
                          : ''
                      }`}
                    />
                  </button>

                  {calendarOpen ===
                    'start' && (
                    <div className="absolute z-[70] left-0 top-full mt-2 w-[310px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

                      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 px-4 py-5 text-white">
                        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10" />

                        <div className="absolute -bottom-14 -left-8 w-28 h-28 rounded-full bg-white/5" />

                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-indigo-200">
                              Campaign Start
                            </p>

                            <h3 className="text-lg  mt-1">
                              {form.startDate
                                ? formatSelectedDate(
                                    form.startDate
                                  )
                                : 'Choose a date'}
                            </h3>
                          </div>

                          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <CalendarDays
                              size={22}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pt-4">

                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={
                              goToPreviousMonth
                            }
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          >
                            <ChevronLeft
                              size={18}
                            />
                          </button>

                          <div className="text-center">
                            <h4 className="text-sm font-extrabold text-gray-900">
                              {monthTitle}
                            </h4>

                            <div className="w-7 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-1.5" />
                          </div>

                          <button
                            type="button"
                            onClick={
                              goToNextMonth
                            }
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          >
                            <ChevronRight
                              size={18}
                            />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 mb-1">
                          {[
                            'S',
                            'M',
                            'T',
                            'W',
                            'T',
                            'F',
                            'S'
                          ].map(
                            (day, index) => (
                              <div
                                key={`${day}-${index}`}
                                className="text-center text-[9px] font-extrabold text-gray-400 py-1.5"
                              >
                                {day}
                              </div>
                            )
                          )}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 pb-3">
                          {calendarDays.map(
                            (
                              date,
                              index
                            ) => {
                              if (!date) {
                                return (
                                  <div
                                    key={`start-empty-${index}`}
                                    className="h-9"
                                  />
                                );
                              }

                              const selected =
                                isSelectedDate(
                                  date,
                                  'start'
                                );

                              const today =
                                isToday(date);

                              return (
                                <button
                                  key={date.toISOString()}
                                  type="button"
                                  onClick={() =>
                                    selectCalendarDate(
                                      date,
                                      'start'
                                    )
                                  }
                                  className={`relative h-9 rounded-xl text-xs font-bold transition-all duration-150 ${
                                    selected
                                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                      : today
                                      ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                      : 'text-gray-700 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700'
                                  }`}
                                >
                                  {date.getDate()}

                                  {today &&
                                    !selected && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <div className="border-t border-gray-100 py-2.5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              goToToday(
                                'start'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            Today
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCalendarOpen(
                                null
                              )
                            }
                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-gray-500 hover:bg-gray-100 transition"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* END DATE */}

                <div className="relative">
                  <label className="mb-1 block text-sm font-semibold text-black">
                    End Date
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      openCalendar('end')
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white transition-all ${
                      calendarOpen ===
                      'end'
                        ? 'border-purple-500 ring-4 ring-purple-100'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      <CalendarDays
                        size={19}
                      />
                    </div>

                    <div className="text-left min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.15em] font-extrabold text-gray-400">
                        End Date
                      </p>

                      <p
                        className={`text-xs font-bold mt-0.5 truncate ${
                          form.endDate
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatSelectedDate(
                          form.endDate
                        )}
                      </p>
                    </div>

                    <ChevronRight
                      size={17}
                      className={`ml-auto shrink-0 text-gray-400 transition-transform ${
                        calendarOpen ===
                        'end'
                          ? 'rotate-90 text-purple-600'
                          : ''
                      }`}
                    />
                  </button>

                  {calendarOpen ===
                    'end' && (
                    <div className="absolute z-[70] right-0 top-full mt-2 w-[310px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

                      <div className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-600 px-4 py-5 text-white">
                        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10" />

                        <div className="absolute -bottom-14 -left-8 w-28 h-28 rounded-full bg-white/5" />

                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-purple-200">
                              Campaign End
                            </p>

                            <h3 className="text-lg  mt-1">
                              {form.endDate
                                ? formatSelectedDate(
                                    form.endDate
                                  )
                                : 'Choose a date'}
                            </h3>
                          </div>

                          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <CalendarDays
                              size={22}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pt-4">

                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={
                              goToPreviousMonth
                            }
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
                          >
                            <ChevronLeft
                              size={18}
                            />
                          </button>

                          <div className="text-center">
                            <h4 className="text-sm font-extrabold text-gray-900">
                              {monthTitle}
                            </h4>

                            <div className="w-7 h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mt-1.5" />
                          </div>

                          <button
                            type="button"
                            onClick={
                              goToNextMonth
                            }
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
                          >
                            <ChevronRight
                              size={18}
                            />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 mb-1">
                          {[
                            'S',
                            'M',
                            'T',
                            'W',
                            'T',
                            'F',
                            'S'
                          ].map(
                            (day, index) => (
                              <div
                                key={`${day}-${index}`}
                                className="text-center text-[9px] font-extrabold text-gray-400 py-1.5"
                              >
                                {day}
                              </div>
                            )
                          )}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 pb-3">
                          {calendarDays.map(
                            (
                              date,
                              index
                            ) => {
                              if (!date) {
                                return (
                                  <div
                                    key={`end-empty-${index}`}
                                    className="h-9"
                                  />
                                );
                              }

                              const selected =
                                isSelectedDate(
                                  date,
                                  'end'
                                );

                              const today =
                                isToday(date);

                              return (
                                <button
                                  key={date.toISOString()}
                                  type="button"
                                  onClick={() =>
                                    selectCalendarDate(
                                      date,
                                      'end'
                                    )
                                  }
                                  className={`relative h-9 rounded-xl text-xs font-bold transition-all duration-150 ${
                                    selected
                                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-200 scale-105'
                                      : today
                                      ? 'bg-purple-50 text-purple-700 ring-2 ring-purple-200'
                                      : 'text-gray-700 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 hover:text-purple-700'
                                  }`}
                                >
                                  {date.getDate()}

                                  {today &&
                                    !selected && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-600" />
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <div className="border-t border-gray-100 py-2.5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              goToToday(
                                'end'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-purple-600 hover:bg-purple-50 transition"
                          >
                            Today
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCalendarOpen(
                                null
                              )
                            }
                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-gray-500 hover:bg-gray-100 transition"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STATUS */}

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUSES.map((s) => (
                    <option
                      key={s}
                      value={s}
                    >
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarOpen(null);
                    setModalMode(null);
                  }}
                  className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving...'
                    : 'Save Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}

      {teamModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">
                Team — {teamModalCampaign.title}
              </h2>

              <button
                onClick={() =>
                  setTeamModalCampaign(null)
                }
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {teamMembers.length === 0 && (
                <p className="text-sm text-gray-400">
                  No team members yet.
                </p>
              )}

              {teamMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {userName(m.userId)}
                    </p>

                    {m.roleOnEntity && (
                      <p className="text-xs text-gray-500">
                        {m.roleOnEntity}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <button
                      onClick={() =>
                        handleRemoveTeamMember(
                          m.userId
                        )
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canManage && (
              <form
                onSubmit={
                  handleAddTeamMember
                }
                className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100"
              >
                <select
                  value={teamUserToAdd}
                  onChange={(e) =>
                    setTeamUserToAdd(
                      e.target.value
                    )
                  }
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                >
                  <option value="">
                    Select staff member...
                  </option>

                  {availableUsersForTeam.map(
                    (u) => (
                      <option
                        key={u.id}
                        value={u.id}
                      >
                        {u.fullName} ({u.role})
                      </option>
                    )
                  )}
                </select>

                <input
                  value={teamRoleToAdd}
                  onChange={(e) =>
                    setTeamRoleToAdd(
                      e.target.value
                    )
                  }
                  placeholder="Role (optional)"
                  className="sm:w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                />

                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Campaigns;