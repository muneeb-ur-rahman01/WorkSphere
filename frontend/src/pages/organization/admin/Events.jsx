import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import {
  CalendarDays,
  Plus,
  MapPin,
  Trash2,
  Pencil,
  Tag,
  CheckCircle2,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';

const EVENT_TYPES = [
  'General',
  'Training',
  'Fundraiser',
  'Awareness',
  'Outreach'
];

const EVENT_STATUSES = [
  'Upcoming',
  'Completed',
  'Cancelled'
];

const Events = () => {
  const {
    currentUser,
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    hasAccess,
    requestVisibility
  } = useContext(AppContext);

  const confirm = useConfirm();

  const [requestingVisibilityId, setRequestingVisibilityId] =
    useState(null);

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

  // Reachable by OrgAdmin always, or by a staff member granted
  // the 'events' Accessibility permission.
  if (
    currentUser.role !== 'OrgAdmin' &&
    !hasAccess('events')
  ) {
    return (
      <Navigate
        to="/staff/dashboard"
        replace
      />
    );
  }

  // ============================================================
  // MODAL STATE
  // ============================================================

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] =
    useState(null);

  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] =
    useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] =
    useState('General');
  const [eventStatus, setEventStatus] =
    useState('Upcoming');

  // ============================================================
  // CUSTOM CALENDAR
  // ============================================================

  const [calendarOpen, setCalendarOpen] =
    useState(false);

  const [calendarMonth, setCalendarMonth] =
    useState(new Date());

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    );

    const lastDay = new Date(
      year,
      month + 1,
      0
    );

    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {
      days.push(
        new Date(
          year,
          month,
          day
        )
      );
    }

    return days;
  };

  const formatDateForInput = date => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatSelectedDate = dateValue => {
    if (!dateValue) {
      return 'Select event date';
    }

    const date = new Date(
      `${dateValue}T00:00:00`
    );

    return date.toLocaleDateString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  };

  const selectEventDate = date => {
    setEventDate(
      formatDateForInput(date)
    );

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

    setEventDate(
      formatDateForInput(today)
    );

    setCalendarOpen(false);
  };

  const isToday = date => {
    const today = new Date();

    return (
      date &&
      date.getFullYear() ===
        today.getFullYear() &&
      date.getMonth() ===
        today.getMonth() &&
      date.getDate() ===
        today.getDate()
    );
  };

  const isSelectedDate = date => {
    if (!date || !eventDate) {
      return false;
    }

    return (
      formatDateForInput(date) ===
      eventDate
    );
  };

  const calendarDays =
    getCalendarDays();

  const monthTitle =
    calendarMonth.toLocaleDateString(
      'en-US',
      {
        month: 'long',
        year: 'numeric'
      }
    );

  // ============================================================
  // FILTER
  // ============================================================

  const [typeFilter, setTypeFilter] =
    useState('All');

  const orgEvents = events.filter(
    e =>
      e.orgId === currentUser.orgId
  );

  const visibleEvents =
    typeFilter === 'All'
      ? orgEvents
      : orgEvents.filter(
          e =>
            e.eventType === typeFilter
        );

  // ============================================================
  // ANALYTICS
  // ============================================================

  const totalEvents =
    orgEvents.length;

  const upcomingCount =
    orgEvents.filter(
      e =>
        e.status === 'Upcoming'
    ).length;

  const completedCount =
    orgEvents.filter(
      e =>
        e.status === 'Completed'
    ).length;

  // ============================================================
  // CREATE / EDIT
  // ============================================================

  const openCreateModal = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventLocation('');
    setEventDate('');
    setEventDesc('');
    setEventType('General');
    setEventStatus('Upcoming');

    setCalendarMonth(new Date());
    setCalendarOpen(false);

    setModalOpen(true);
  };

  const openEditModal = event => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventLocation(event.location);
    setEventDate(event.date);
    setEventDesc(
      event.description || ''
    );
    setEventType(
      event.eventType || 'General'
    );
    setEventStatus(
      event.status || 'Upcoming'
    );

    if (event.date) {
      const selectedDate =
        new Date(
          `${event.date}T00:00:00`
        );

      setCalendarMonth(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
      );
    } else {
      setCalendarMonth(
        new Date()
      );
    }

    setCalendarOpen(false);
    setModalOpen(true);
  };

  const handleSubmitEvent =
    async e => {
      e.preventDefault();

      if (
        !eventTitle ||
        !eventLocation ||
        !eventDate
      ) {
        return;
      }

      if (editingEventId) {
        await updateEvent(
          editingEventId,
          {
            title: eventTitle,
            location: eventLocation,
            date: eventDate,
            description: eventDesc,
            eventType,
            status: eventStatus
          }
        );
      } else {
        await createEvent(
          eventTitle,
          eventLocation,
          eventDate,
          eventDesc,
          eventType
        );

        // GREEN SUCCESS TOAST
        showToast(
          'Success',
          'success'
        );
      }

      setEditingEventId(null);
      setEventTitle('');
      setEventLocation('');
      setEventDate('');
      setEventDesc('');
      setEventType('General');
      setEventStatus('Upcoming');
      setCalendarOpen(false);
      setModalOpen(false);
    };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDeleteEvent =
    async event => {
      const ok = await confirm({
        title: 'Delete this event?',
        message: `"${event.title}" will be permanently removed. This cannot be undone.`,
        confirmLabel: 'Delete',
        variant: 'danger'
      });

      if (!ok) return;

      await deleteEvent(event.id);

      // RED DELETED TOAST
      showToast(
        'Deleted',
        'error'
      );
    };

  // ============================================================
  // COMPLETE
  // ============================================================

  const handleMarkComplete =
    async event => {
      await updateEvent(
        event.id,
        {
          status: 'Completed'
        }
      );
    };

  // ============================================================
  // VISIBILITY
  // ============================================================

  const handleRequestVisibility =
    async event => {
      setRequestingVisibilityId(
        event.id
      );

      await requestVisibility(
        'event',
        event.id
      );

      setRequestingVisibilityId(
        null
      );
    };

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
                  ? 'Event deleted successfully'
                  : 'Event created successfully'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">
            Organization Events
          </h1>

          <p className="text-gray-600 mt-2">
            Plan trainings, fundraisers,
            awareness drives and community
            outreach events, separate from
            medical camp deployments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg transition"
        >
          <Plus size={18} />
          Create New Event
        </button>
      </div>

      {/* ========================================================
          EVENT ANALYTICS
      ======================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Events
          </p>

          <p className="text-3xl font-bold text-black mt-1">
            {totalEvents}
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

      {/* ========================================================
          TYPE FILTER
      ======================================================== */}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          'All',
          ...EVENT_TYPES
        ].map(type => (
          <button
            key={type}
            onClick={() =>
              setTypeFilter(type)
            }
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              typeFilter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* ========================================================
          EVENT CARDS
      ======================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {visibleEvents.length > 0 ? (
          visibleEvents.map(event => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-6"
            >

              <div className="flex items-start justify-between gap-2">

                <h3 className="text-xl font-bold text-black">
                  {event.title}
                </h3>

                <div className="flex items-center gap-1 shrink-0">

                  {event.status ===
                    'Upcoming' && (
                    <button
                      onClick={() =>
                        handleMarkComplete(
                          event
                        )
                      }
                      title="Mark as completed"
                      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-green-600 transition"
                    >
                      <CheckCircle2
                        size={16}
                      />
                    </button>
                  )}

                  <button
                    onClick={() =>
                      openEditModal(event)
                    }
                    title="Edit event"
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                  >
                    <Pencil
                      size={16}
                    />
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteEvent(
                        event
                      )
                    }
                    title="Delete event"
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>

                </div>
              </div>

              <div className="flex items-center gap-2 mt-1 text-gray-600">
                <MapPin size={14} />

                <span>
                  {event.location}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4 text-gray-700 text-sm">

                <CalendarDays
                  size={16}
                />

                <span>
                  <strong>
                    {event.date}
                  </strong>
                </span>

                <span
                  className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                    event.status ===
                    'Upcoming'
                      ? 'bg-blue-100 text-blue-700'
                      : event.status ===
                        'Completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {event.status}
                </span>

              </div>

              <div className="flex items-center gap-2 mt-3 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 w-fit">
                <Tag size={12} />

                {event.eventType ||
                  'General'}
              </div>

              <p className="text-gray-700 mt-4 min-h-[60px]">
                {event.description ||
                  'No additional details provided.'}
              </p>

              {/* Public Home Page visibility */}
              <div className="mt-4">

                {event.visibilityStatus ===
                  'Approved' && (
                  <span className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg py-2">
                    <Globe size={14} />
                    Publicly visible on Home Page
                  </span>
                )}

                {event.visibilityStatus ===
                  'Pending' && (
                  <span className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2">
                    <Clock size={14} />
                    Visibility request pending review
                  </span>
                )}

                {(!event.visibilityStatus ||
                  event.visibilityStatus ===
                    'None' ||
                  event.visibilityStatus ===
                    'Rejected') && (
                  <button
                    onClick={() =>
                      handleRequestVisibility(
                        event
                      )
                    }
                    disabled={
                      requestingVisibilityId ===
                      event.id
                    }
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg py-2 transition disabled:opacity-50"
                  >
                    <Globe size={14} />

                    {event.visibilityStatus ===
                    'Rejected'
                      ? 'Request Rejected — Resubmit'
                      : 'Request Public Visibility'}
                  </button>
                )}

                {event.visibilityStatus ===
                  'Rejected' &&
                  event.visibilityRejectionReason && (
                    <p className="text-[11px] text-red-500 mt-1 text-center">
                      Reason:{' '}
                      {
                        event.visibilityRejectionReason
                      }
                    </p>
                  )}

              </div>

            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border rounded-xl p-16 text-center shadow">

            <CalendarDays
              size={45}
              className="mx-auto text-gray-500 mb-4"
            />

            <h3 className="text-xl font-bold text-black">
              No Events Yet
            </h3>

            <p className="text-gray-600 mt-2">
              Click "Create New Event"
              to schedule your first
              organization event.
            </p>

          </div>
        )}

      </div>

      {/* ========================================================
          CREATE / EDIT EVENT MODAL
      ======================================================== */}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold text-black">
                {editingEventId
                  ? 'Edit Event'
                  : 'Create Organization Event'}
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
              onSubmit={
                handleSubmitEvent
              }
              className="space-y-5"
            >

              {/* Event Title */}
              <div>

                <label className="block font-semibold text-black mb-2">
                  Event Title
                </label>

                <input
                  type="text"
                  value={eventTitle}
                  onChange={e =>
                    setEventTitle(
                      e.target.value
                    )
                  }
                  placeholder="Community Health Awareness Drive"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* Event Type */}
              <div>

                <label className="block font-semibold text-black mb-2">
                  Event Type
                </label>

                <select
                  value={eventType}
                  onChange={e =>
                    setEventType(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVENT_TYPES.map(
                    type => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* Status */}
              {editingEventId && (
                <div>

                  <label className="block font-semibold text-black mb-2">
                    Status
                  </label>

                  <select
                    value={eventStatus}
                    onChange={e =>
                      setEventStatus(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {EVENT_STATUSES.map(
                      status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>

                </div>
              )}

              {/* Location */}
              <div>

                <label className="block font-semibold text-black mb-2">
                  Event Location
                </label>

                <input
                  type="text"
                  value={eventLocation}
                  onChange={e =>
                    setEventLocation(
                      e.target.value
                    )
                  }
                  placeholder="Community Hall, Karachi"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* ==================================================
                  MODERN CUSTOM CALENDAR
              ================================================== */}

              <div className="relative">

                <label className="block font-semibold text-black mb-2">
                  Date of Event
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setCalendarOpen(
                      !calendarOpen
                    )
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-white transition-all duration-200 ${
                    calendarOpen
                      ? 'border-indigo-500 ring-4 ring-indigo-100'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
                      <CalendarDays
                        size={21}
                      />
                    </div>

                    <div className="text-left">

                      <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-gray-400">
                        Event Date
                      </p>

                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          eventDate
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatSelectedDate(
                          eventDate
                        )}
                      </p>

                    </div>

                  </div>

                  <ChevronRight
                    size={19}
                    className={`text-gray-400 transition-transform duration-200 ${
                      calendarOpen
                        ? 'rotate-90 text-indigo-600'
                        : ''
                    }`}
                  />

                </button>

                {calendarOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

                    {/* Calendar Top Header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 px-5 py-6 text-white">

                      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10" />

                      <div className="absolute -bottom-16 -left-10 w-36 h-36 rounded-full bg-white/5" />

                      <div className="relative flex items-center justify-between">

                        <div>

                          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-indigo-200">
                            Select Event Date
                          </p>

                          <h3 className="text-2xl mt-1">
                            {eventDate
                              ? formatSelectedDate(
                                  eventDate
                                )
                              : 'Choose a date'}
                          </h3>

                        </div>

                        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                          <CalendarDays
                            size={27}
                          />
                        </div>

                      </div>

                    </div>

                    {/* Calendar Body */}
                    <div className="px-5 pt-5">

                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">

                        <button
                          type="button"
                          onClick={
                            goToPreviousMonth
                          }
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          <ChevronLeft
                            size={19}
                          />
                        </button>

                        <div className="text-center">

                          <h4 className="font-extrabold text-gray-900">
                            {monthTitle}
                          </h4>

                          <div className="w-8 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-1.5" />

                        </div>

                        <button
                          type="button"
                          onClick={
                            goToNextMonth
                          }
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          <ChevronRight
                            size={19}
                          />
                        </button>

                      </div>

                      {/* Weekdays */}
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
                            className="text-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400 py-2"
                          >
                            {day}
                          </div>
                        ))}

                      </div>

                      {/* Days */}
                      <div className="grid grid-cols-7 gap-1.5 pb-4">

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
                              isSelectedDate(
                                date
                              );

                            const today =
                              isToday(date);

                            return (
                              <button
                                key={date.toISOString()}
                                type="button"
                                onClick={() =>
                                  selectEventDate(
                                    date
                                  )
                                }
                                className={`relative h-10 rounded-xl text-sm font-bold transition-all duration-150 ${
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

                      {/* Calendar Footer */}
                      <div className="border-t border-gray-100 py-3 flex items-center justify-between">

                        <button
                          type="button"
                          onClick={
                            goToToday
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          Today
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setCalendarOpen(
                              false
                            )
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-gray-500 hover:bg-gray-100 transition"
                        >
                          Close
                        </button>

                      </div>

                    </div>

                  </div>
                )}

              </div>

              {/* Description */}
              <div>

                <label className="block font-semibold text-black mb-2">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={eventDesc}
                  onChange={e =>
                    setEventDesc(
                      e.target.value
                    )
                  }
                  placeholder="Agenda, target audience, partners involved..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                📢 <strong>Heads up:</strong>{' '}
                Saving this event will
                broadcast an announcement
                notification to all registered
                staff.
              </div>

              {/* Buttons */}
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
                  {editingEventId
                    ? 'Save Changes'
                    : 'Create Event'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </DashboardLayout>
  );
};

export default Events;