import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import {
  Calendar,
  CalendarDays,
  Plus,
  MapPin,
  UserCheck,
  HelpCircle,
  UserX,
  Trash2,
  Pencil,
  CheckCircle2,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const CAMP_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

const Camps = () => {
  const {
    currentUser,
    camps,
    createCamp,
    updateCamp,
    deleteCamp,
    availability,
    users,
    hasAccess,
    requestVisibility
  } = useContext(AppContext);

  const confirm = useConfirm();

  const [requestingVisibilityId, setRequestingVisibilityId] = useState(null);

  // Toast
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

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampId, setEditingCampId] = useState(null);
  const [campTitle, setCampTitle] = useState('');
  const [campLocation, setCampLocation] = useState('');
  const [campDate, setCampDate] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campStatus, setCampStatus] = useState('Upcoming');

  // Custom calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Selected camp availability details
  const [activeCampForAvailability, setActiveCampForAvailability] =
    useState(null);
  const [availModalOpen, setAvailModalOpen] = useState(false);

  if (currentUser.role !== 'OrgAdmin' && !hasAccess('camps')) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Filter camps belonging to this organization
  const orgCamps = camps.filter(
    c => c.orgId === currentUser.orgId
  );

  // Quick analytics
  const totalCamps = orgCamps.length;

  const upcomingCount = orgCamps.filter(
    c => c.status === 'Upcoming'
  ).length;

  const completedCount = orgCamps.filter(
    c => c.status === 'Completed'
  ).length;

  // ============================================================
  // CUSTOM CALENDAR
  // ============================================================

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

  const formatDateForInput = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatSelectedDate = dateValue => {
    if (!dateValue) return 'Select camp date';

    const date = new Date(`${dateValue}T00:00:00`);

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const selectCampDate = date => {
    setCampDate(formatDateForInput(date));
    setCalendarOpen(false);
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

  const goToToday = () => {
    const today = new Date();

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setCampDate(formatDateForInput(today));
    setCalendarOpen(false);
  };

  const isToday = date => {
    const today = new Date();

    return (
      date &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSelectedDate = date => {
    if (!date || !campDate) return false;

    return formatDateForInput(date) === campDate;
  };

  const calendarDays = getCalendarDays();

  const monthTitle = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // ============================================================
  // CAMP FUNCTIONS
  // ============================================================

  const openCreateModal = () => {
    setEditingCampId(null);
    setCampTitle('');
    setCampLocation('');
    setCampDate('');
    setCampDesc('');
    setCampStatus('Upcoming');

    setCalendarMonth(new Date());
    setCalendarOpen(false);

    setModalOpen(true);
  };

  const openEditModal = camp => {
    setEditingCampId(camp.id);
    setCampTitle(camp.title);
    setCampLocation(camp.location);
    setCampDate(camp.date);
    setCampDesc(camp.description || '');
    setCampStatus(camp.status || 'Upcoming');

    if (camp.date) {
      const selectedDate = new Date(
        `${camp.date}T00:00:00`
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

    setCalendarOpen(false);
    setModalOpen(true);
  };

  const handleSubmitCamp = async e => {
    e.preventDefault();

    if (!campTitle || !campLocation || !campDate) return;

    if (editingCampId) {
      await updateCamp(editingCampId, {
        title: campTitle,
        location: campLocation,
        date: campDate,
        description: campDesc,
        status: campStatus
      });
    } else {
      await createCamp(
        campTitle,
        campLocation,
        campDate,
        campDesc
      );

      // GREEN TOAST
      showToast('Camp Created', 'success');
    }

    setEditingCampId(null);
    setCampTitle('');
    setCampLocation('');
    setCampDate('');
    setCampDesc('');
    setCampStatus('Upcoming');
    setCalendarOpen(false);
    setModalOpen(false);
  };

  const handleDeleteCamp = async camp => {
    const ok = await confirm({
      title: 'Delete this camp?',
      message: `"${camp.title}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (!ok) return;

    await deleteCamp(camp.id);

    // RED TOAST
    showToast('Camp Deleted', 'error');
  };

  const handleMarkComplete = async camp => {
    await updateCamp(camp.id, {
      status: 'Completed'
    });
  };

  const handleViewAvailability = camp => {
    setActiveCampForAvailability(camp);
    setAvailModalOpen(true);
  };

  const handleRequestVisibility = async camp => {
    setRequestingVisibilityId(camp.id);

    await requestVisibility(
      'camp',
      camp.id
    );

    setRequestingVisibilityId(null);
  };

  // ============================================================
  // AVAILABILITY
  // ============================================================

  const getAvailabilityStats = campId => {
    const campAvails = availability.filter(
      a => a.campId === campId
    );

    const available = campAvails.filter(
      a => a.status === 'Available'
    ).length;

    const maybe = campAvails.filter(
      a => a.status === 'Maybe'
    ).length;

    const notAvailable = campAvails.filter(
      a => a.status === 'NotAvailable'
    ).length;

    return {
      available,
      maybe,
      notAvailable
    };
  };

  const getCampAvailabilityList = () => {
    if (!activeCampForAvailability) return [];

    const orgStaff = users.filter(
      u =>
        u.orgId === currentUser.orgId &&
        u.status === 'Active' &&
        u.role !== 'OrgAdmin'
    );

    return orgStaff.map(staff => {
      const record = availability.find(
        a =>
          a.campId === activeCampForAvailability.id &&
          a.userId === staff.id
      );

      return {
        id: staff.id,
        fullName: staff.fullName,
        role: staff.role,
        status: record
          ? record.status
          : 'Pending Response'
      };
    });
  };

  const campAvailsList =
    getCampAvailabilityList();

  return (
    <DashboardLayout>

      {/* ========================================================
          TOAST MESSAGE
      ======================================================== */}

      {toast.show && (
        <div className="fixed top-6 right-6 z-[9999]">
          <div
            className={`flex items-center gap-3 bg-white shadow-xl rounded-xl px-5 py-4 min-w-[240px] border ${
              toast.type === 'error'
                ? 'border-red-200'
                : 'border-green-200'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                toast.type === 'error'
                  ? 'bg-red-100'
                  : 'bg-green-100'
              }`}
            >
              <CheckCircle2
                size={20}
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
                  ? 'Camp deleted successfully'
                  : 'Camp created successfully'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">
            Medical Camps & Deployments
          </h1>

          <p className="text-gray-600 mt-2">
            Schedule new camp locations, inspect upcoming sites,
            and monitor staff availability rosters.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg transition"
        >
          <Plus size={18} />
          Schedule New Camp
        </button>
      </div>

      {/* Camp Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Camps
          </p>

          <p className="text-3xl font-bold text-black mt-1">
            {totalCamps}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Upcoming
          </p>

          <p className="text-3xl font-bold text-blue-600 mt-1">
            {upcomingCount}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Completed
          </p>

          <p className="text-3xl font-bold text-green-600 mt-1">
            {completedCount}
          </p>
        </div>
      </div>

      {/* Camp Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orgCamps.length > 0 ? (
          orgCamps.map(camp => {
            const {
              available,
              maybe,
              notAvailable
            } = getAvailabilityStats(camp.id);

            return (
              <div
                key={camp.id}
                className="bg-white border border-gray-200 rounded-xl shadow-md p-6"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold text-black">
                    {camp.title}
                  </h3>

                  <div className="flex items-center gap-1 shrink-0">
                    {camp.status === 'Upcoming' && (
                      <button
                        onClick={() =>
                          handleMarkComplete(camp)
                        }
                        title="Mark as completed"
                        className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-green-600 transition"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}

                    <button
                      onClick={() =>
                        openEditModal(camp)
                      }
                      title="Edit camp"
                      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteCamp(camp)
                      }
                      title="Delete camp"
                      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 mt-1 flex items-center gap-1.5">
                  <MapPin
                    size={14}
                    className="text-gray-400 shrink-0"
                  />

                  {camp.location}
                </p>

                <div className="flex items-center gap-2 mt-4 text-gray-700 text-sm">
                  <Calendar size={16} />

                  <span>
                    <strong>{camp.date}</strong>
                  </span>

                  <span
                    className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                      camp.status === 'Upcoming'
                        ? 'bg-blue-100 text-blue-700'
                        : camp.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {camp.status}
                  </span>
                </div>

                <p className="text-gray-700 mt-5 min-h-[70px]">
                  {camp.description ||
                    'No detailed instructions provided.'}
                </p>

                <div className="bg-gray-100 border rounded-lg p-4 mt-5">
                  <p className="text-sm font-bold text-gray-800 mb-3">
                    Roster Availability Summary
                  </p>

                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-green-600">
                      🟢 Available: {available}
                    </span>

                    <span className="text-yellow-600">
                      🟡 Maybe: {maybe}
                    </span>

                    <span className="text-red-600">
                      🔴 Not Available: {notAvailable}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleViewAvailability(camp)
                  }
                  className="w-full mt-6 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-3 rounded-lg transition"
                >
                  Inspect Personnel Availability
                </button>

                {/* Public Home Page visibility */}
                <div className="mt-3">
                  {camp.visibilityStatus === 'Approved' && (
                    <span className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg py-2">
                      <Globe size={14} />
                      Publicly visible on Home Page
                    </span>
                  )}

                  {camp.visibilityStatus === 'Pending' && (
                    <span className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2">
                      <Clock size={14} />
                      Visibility request pending review
                    </span>
                  )}

                  {(!camp.visibilityStatus ||
                    camp.visibilityStatus === 'None' ||
                    camp.visibilityStatus === 'Rejected') && (
                    <button
                      onClick={() =>
                        handleRequestVisibility(camp)
                      }
                      disabled={
                        requestingVisibilityId === camp.id
                      }
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg py-2 transition disabled:opacity-50"
                    >
                      <Globe size={14} />

                      {camp.visibilityStatus === 'Rejected'
                        ? 'Request Rejected — Resubmit'
                        : 'Request Public Visibility'}
                    </button>
                  )}

                  {camp.visibilityStatus === 'Rejected' &&
                    camp.visibilityRejectionReason && (
                      <p className="text-[11px] text-red-500 mt-1 text-center">
                        Reason: {camp.visibilityRejectionReason}
                      </p>
                    )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white border rounded-xl p-16 text-center shadow">
            <Calendar
              size={45}
              className="mx-auto text-gray-500 mb-4"
            />

            <h3 className="text-xl font-bold text-black">
              No Camps Scheduled Yet
            </h3>

            <p className="text-gray-600 mt-2">
              Click "Schedule New Camp" to launch your first camp.
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit Camp Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">
                {editingCampId
                  ? 'Edit Medical Deployment Camp'
                  : 'Schedule Medical Deployment Camp'}
              </h2>

              <button
                onClick={() => {
                  setCalendarOpen(false);
                  setModalOpen(false);
                }}
                className="text-gray-500 hover:text-red-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmitCamp}
              className="space-y-5"
            >
              <div>
                <label className="block font-semibold text-black mb-2">
                  Camp / Deployment Title
                </label>

                <input
                  type="text"
                  value={campTitle}
                  onChange={e =>
                    setCampTitle(e.target.value)
                  }
                  placeholder="Flood Relief General Medicine Clinic"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-black mb-2">
                  Deployment Location
                </label>

                <input
                  type="text"
                  value={campLocation}
                  onChange={e =>
                    setCampLocation(e.target.value)
                  }
                  placeholder="Swat Valley Relief Camps"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* CUSTOM DATE CALENDAR */}
              <div className="relative">
                <label className="block font-semibold text-black mb-2">
                  Date of Camp
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setCalendarOpen(!calendarOpen)
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-white transition-all duration-200 ${
                    calendarOpen
                      ? 'border-indigo-500 ring-4 ring-indigo-100'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                      <CalendarDays size={19} />
                    </div>

                    <div className="text-left">
                      <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                        Camp Date
                      </p>

                      <p
                        className={`text-sm font-bold ${
                          campDate
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatSelectedDate(campDate)}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    className={`text-gray-400 transition-transform ${
                      calendarOpen
                        ? 'rotate-90 text-indigo-600'
                        : ''
                    }`}
                  />
                </button>

                {calendarOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 px-5 py-5 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
                            Select Date
                          </p>

                          <h3 className="text-2xl mt-1">
                            {campDate
                              ? formatSelectedDate(campDate)
                              : 'Choose a date'}
                          </h3>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                          <CalendarDays size={24} />
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pt-5">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={goToPreviousMonth}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          <ChevronLeft size={19} />
                        </button>

                        <h4 className="font-extrabold text-gray-900">
                          {monthTitle}
                        </h4>

                        <button
                          type="button"
                          onClick={goToNextMonth}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          <ChevronRight size={19} />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 mb-2">
                        {[
                          'Sun',
                          'Mon',
                          'Tue',
                          'Wed',
                          'Thu',
                          'Fri',
                          'Sat'
                        ].map(day => (
                          <div
                            key={day}
                            className="text-center text-[11px] font-bold uppercase text-gray-400 py-2"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 pb-4">
                        {calendarDays.map(
                          (date, index) => {
                            if (!date) {
                              return (
                                <div
                                  key={`empty-${index}`}
                                  className="h-10"
                                />
                              );
                            }

                            const selected =
                              isSelectedDate(date);

                            const today =
                              isToday(date);

                            return (
                              <button
                                key={date.toISOString()}
                                type="button"
                                onClick={() =>
                                  selectCampDate(date)
                                }
                                className={`relative h-10 rounded-lg text-sm font-semibold transition-all duration-150 ${
                                  selected
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                                    : today
                                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                              >
                                {date.getDate()}

                                {today &&
                                  !selected && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600" />
                                  )}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <div className="border-t border-gray-100 px-0 py-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={goToToday}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          Today
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setCalendarOpen(false)
                          }
                          className="text-xs font-bold text-gray-500 hover:text-gray-800 transition"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-black mb-2">
                  Description / Scope of Service
                </label>

                <textarea
                  rows={4}
                  value={campDesc}
                  onChange={e =>
                    setCampDesc(e.target.value)
                  }
                  placeholder="Specify medication, target demographic etc..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editingCampId && (
                <div>
                  <label className="block font-semibold text-black mb-2">
                    Status
                  </label>

                  <select
                    value={campStatus}
                    onChange={e =>
                      setCampStatus(e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CAMP_STATUSES.map(status => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                📢 <strong>Availability Trigger:</strong>{' '}
                Saving this camp will automatically broadcast
                an availability request to all registered staff
                (Employees, Interns, Volunteers, Members &
                Executive Directors).
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarOpen(false);
                    setModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-lg border border-gray-300 bg-gray-100 text-black font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {editingCampId
                    ? 'Save Changes'
                    : 'Create Camp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {availModalOpen &&
        activeCampForAvailability && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Roster Status:{' '}
                    {activeCampForAvailability.title}
                  </h2>

                  <div className="flex items-center gap-2 text-gray-600 mt-2">
                    <MapPin size={16} />

                    <span>
                      {activeCampForAvailability.location}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setAvailModalOpen(false)
                  }
                  className="text-gray-500 hover:text-red-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              {campAvailsList.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold text-black">
                          Personnel
                        </th>

                        <th className="px-5 py-3 text-left font-bold text-black">
                          Role
                        </th>

                        <th className="px-5 py-3 text-left font-bold text-black">
                          Availability
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {campAvailsList.map(staff => {
                        let badge =
                          'bg-gray-100 text-gray-700';

                        let icon = (
                          <HelpCircle size={16} />
                        );

                        if (
                          staff.status ===
                          'Available'
                        ) {
                          badge =
                            'bg-green-100 text-green-700';

                          icon = (
                            <UserCheck size={16} />
                          );
                        }

                        if (
                          staff.status === 'Maybe'
                        ) {
                          badge =
                            'bg-yellow-100 text-yellow-700';

                          icon = (
                            <HelpCircle size={16} />
                          );
                        }

                        if (
                          staff.status ===
                          'NotAvailable'
                        ) {
                          badge =
                            'bg-red-100 text-red-700';

                          icon = (
                            <UserX size={16} />
                          );
                        }

                        return (
                          <tr
                            key={staff.id}
                            className="border-t border-gray-200"
                          >
                            <td className="px-5 py-4 font-semibold text-black">
                              {staff.fullName}
                            </td>

                            <td className="px-5 py-4 text-gray-700">
                              {staff.role}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold ${badge}`}
                              >
                                {icon}
                                {staff.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500">
                  No personnel registered to this NGO yet.
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() =>
                    setAvailModalOpen(false)
                  }
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                >
                  Close Roster
                </button>
              </div>
            </div>
          </div>
        )}

    </DashboardLayout>
  );
};

export default Camps;