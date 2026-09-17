import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import {
  Briefcase,
  Plus,
  Search,
  Edit,
  Trash2,
  Users as UsersIcon,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

const STATUSES = [
  'Planning',
  'Active',
  'OnHold',
  'Completed',
  'Cancelled'
];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-700';
    case 'Planning':
      return 'bg-blue-100 text-blue-700';
    case 'OnHold':
      return 'bg-amber-100 text-amber-700';
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
  objectives: '',
  location: '',
  startDate: '',
  endDate: '',
  budget: '',
  status: 'Planning'
};

const Projects = () => {
  const {
    projects,
    users,
    tasks,
    createProject,
    updateProject,
    deleteProject,
    getProjectTeam,
    addProjectTeamMember,
    removeProjectTeamMember,
    currentUser
  } = useContext(AppContext);

  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [teamModalProject, setTeamModalProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamUserToAdd, setTeamUserToAdd] = useState('');
  const [teamRoleToAdd, setTeamRoleToAdd] = useState('');

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
  // FILTER
  // ============================================================

  const filtered = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            statusFilter === 'All' ||
            p.status === statusFilter
        )
        .filter((p) =>
          p.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ),
    [projects, statusFilter, searchTerm]
  );

  const taskCount = (projectId) =>
    tasks.filter(
      (t) => t.projectId === projectId
    ).length;

  // ============================================================
  // CREATE / EDIT
  // ============================================================

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode('create');
    setError('');
    setCalendarOpen(null);
    setCalendarMonth(new Date());
  };

  const openEdit = (p) => {
    setForm({
      title: p.title,
      description: p.description || '',
      objectives: p.objectives || '',
      location: p.location || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      budget: p.budget || '',
      status: p.status
    });

    setEditingId(p.id);
    setModalMode('edit');
    setError('');
    setCalendarOpen(null);

    if (p.startDate) {
      const date = new Date(
        `${p.startDate}T00:00:00`
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
        ? await createProject(form)
        : await updateProject(
            editingId,
            form
          );

    setSubmitting(false);

    if (res.success) {
      setModalMode(null);
      setCalendarOpen(null);

      if (modalMode === 'create') {
        showToast('Success', 'success');
      }
    } else {
      setError(res.error);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (p) => {
    const ok = await confirm({
      title: 'Delete this project?',
      message: `"${p.title}" and its team assignments will be permanently removed.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (ok) {
      await deleteProject(p.id);

      showToast(
        'Deleted',
        'error'
      );
    }
  };

  // ============================================================
  // TEAM
  // ============================================================

  const openTeamModal = async (p) => {
    setTeamModalProject(p);
    setTeamUserToAdd('');
    setTeamRoleToAdd('');

    const res =
      await getProjectTeam(p.id);

    if (res.success) {
      setTeamMembers(res.members);
    }
  };

  const refreshTeam = async () => {
    const res =
      await getProjectTeam(
        teamModalProject.id
      );

    if (res.success) {
      setTeamMembers(res.members);
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();

    if (!teamUserToAdd) return;

    await addProjectTeamMember(
      teamModalProject.id,
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
    await removeProjectTeamMember(
      teamModalProject.id,
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
              <CheckCircle2
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
                  ? 'Project deleted successfully'
                  : 'Project created successfully'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Briefcase
              size={26}
              className="text-indigo-600"
            />{' '}
            Projects
          </h1>

          <p className="text-gray-600 mt-1">
            Plan, staff and track your
            organization's projects.
          </p>
        </div>

        {currentUser?.role === 'OrgAdmin' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Projects
          </p>

          <p className="text-3xl font-bold text-black mt-1">
            {projects.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Active
          </p>

          <p className="text-3xl font-bold text-blue-600 mt-1">
            {
              projects.filter(
                (p) => p.status === 'Active'
              ).length
            }
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Completed
          </p>

          <p className="text-3xl font-bold text-green-600 mt-1">
            {
              projects.filter(
                (p) =>
                  p.status === 'Completed'
              ).length
            }
          </p>
        </div>
      </div>

      {/* SEARCH / FILTER */}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Search
            size={20}
            className="text-gray-500"
          />

          <input
            type="text"
            placeholder="Search projects..."
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

      {/* PROJECT CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">
            No projects match these
            filters.
          </div>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-black text-lg">
                {p.title}
              </h3>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClass(
                  p.status
                )}`}
              >
                {p.status}
              </span>
            </div>

            {p.description && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {p.description}
              </p>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              {p.location && (
                <p>📍 {p.location}</p>
              )}

              {(p.startDate ||
                p.endDate) && (
                <p>
                  🗓 {p.startDate || '—'} →{' '}
                  {p.endDate || '—'}
                </p>
              )}

              {p.budget && (
                <p>
                  💰 Budget:{' '}
                  {Number(
                    p.budget
                  ).toLocaleString()}
                </p>
              )}

              <p>
                ✅ {taskCount(p.id)} linked
                task
                {taskCount(p.id) === 1
                  ? ''
                  : 's'}
              </p>
            </div>

            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
              <button
                onClick={() =>
                  openTeamModal(p)
                }
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition"
              >
                <UsersIcon size={14} /> Team
              </button>

              {currentUser?.role ===
                'OrgAdmin' && (
                <>
                  <button
                    onClick={() =>
                      openEdit(p)
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                  >
                    <Edit size={14} /> Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(p)
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold text-black mb-4">
              {modalMode === 'create'
                ? 'New Project'
                : 'Edit Project'}
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
                      title: e.target.value
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

              {/* OBJECTIVES */}

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Objectives
                </label>

                <textarea
                  value={form.objectives}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      objectives:
                        e.target.value
                    })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* LOCATION / BUDGET */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Location
                  </label>

                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        location:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Budget
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        budget:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* ==================================================
                  MODERN START / END DATE CALENDARS
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
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md">
                      <CalendarDays
                        size={17}
                      />
                    </div>

                    <div className="text-left min-w-0">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">
                        Start
                      </p>

                      <p
                        className={`text-xs font-bold truncate ${
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
                  </button>

                  {calendarOpen ===
                    'start' && (
                    <div className="absolute z-[60] left-0 top-full mt-2 w-[310px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

                      {/* HEADER */}

                      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 px-4 py-4 text-white">
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-white/10" />

                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.16em] font-bold text-indigo-200">
                              Start Date
                            </p>

                            <h3 className="text-lg mt-0.5">
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

                      {/* BODY */}

                      <div className="px-4 pt-4">

                        {/* MONTH */}

                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={
                              goToPreviousMonth
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          >
                            <ChevronLeft
                              size={17}
                            />
                          </button>

                          <div className="text-center">
                            <h4 className="text-sm font-extrabold text-gray-900">
                              {monthTitle}
                            </h4>

                            <div className="w-6 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-1" />
                          </div>

                          <button
                            type="button"
                            onClick={
                              goToNextMonth
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          >
                            <ChevronRight
                              size={17}
                            />
                          </button>
                        </div>

                        {/* WEEKDAYS */}

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

                        {/* DAYS */}

                        <div className="grid grid-cols-7 gap-1 pb-3">
                          {calendarDays.map(
                            (
                              date,
                              index
                            ) => {
                              if (!date) {
                                return (
                                  <div
                                    key={`empty-start-${index}`}
                                    className="h-8"
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
                                  className={`relative h-8 rounded-lg text-xs font-bold transition-all ${
                                    selected
                                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md scale-105'
                                      : today
                                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                                      : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                                  }`}
                                >
                                  {date.getDate()}

                                  {today &&
                                    !selected && (
                                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600" />
                                    )}
                                </button>
                              );
                            }
                          )}
                        </div>

                        {/* FOOTER */}

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
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      <CalendarDays
                        size={17}
                      />
                    </div>

                    <div className="text-left min-w-0">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">
                        End
                      </p>

                      <p
                        className={`text-xs font-bold truncate ${
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
                  </button>

                  {calendarOpen ===
                    'end' && (
                    <div className="absolute z-[60] right-0 top-full mt-2 w-[310px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

                      {/* HEADER */}

                      <div className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-600 px-4 py-4 text-white">
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-white/10" />

                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.16em] font-bold text-purple-200">
                              End Date
                            </p>

                            <h3 className="text-lg mt-0.5">
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

                      {/* BODY */}

                      <div className="px-4 pt-4">

                        {/* MONTH */}

                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={
                              goToPreviousMonth
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
                          >
                            <ChevronLeft
                              size={17}
                            />
                          </button>

                          <div className="text-center">
                            <h4 className="text-sm font-extrabold text-gray-900">
                              {monthTitle}
                            </h4>

                            <div className="w-6 h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mt-1" />
                          </div>

                          <button
                            type="button"
                            onClick={
                              goToNextMonth
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
                          >
                            <ChevronRight
                              size={17}
                            />
                          </button>
                        </div>

                        {/* WEEKDAYS */}

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

                        {/* DAYS */}

                        <div className="grid grid-cols-7 gap-1 pb-3">
                          {calendarDays.map(
                            (
                              date,
                              index
                            ) => {
                              if (!date) {
                                return (
                                  <div
                                    key={`empty-end-${index}`}
                                    className="h-8"
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
                                  className={`relative h-8 rounded-lg text-xs font-bold transition-all ${
                                    selected
                                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md scale-105'
                                      : today
                                      ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                                      : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                                  }`}
                                >
                                  {date.getDate()}

                                  {today &&
                                    !selected && (
                                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-600" />
                                    )}
                                </button>
                              );
                            }
                          )}
                        </div>

                        {/* FOOTER */}

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
                    : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}

      {teamModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">
                Team — {teamModalProject.title}
              </h2>

              <button
                onClick={() =>
                  setTeamModalProject(
                    null
                  )
                }
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {teamMembers.length ===
                0 && (
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
                      {userName(
                        m.userId
                      )}
                    </p>

                    {m.roleOnEntity && (
                      <p className="text-xs text-gray-500">
                        {m.roleOnEntity}
                      </p>
                    )}
                  </div>

                  {currentUser?.role ===
                    'OrgAdmin' && (
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

            {currentUser?.role ===
              'OrgAdmin' && (
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
                        {u.fullName} (
                        {u.role})
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

export default Projects;