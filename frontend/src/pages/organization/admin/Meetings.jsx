import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import DateInputDMY, { formatDMY } from '../../../shared/DateInputDMY/DateInputDMY';
import {
  Video,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  CalendarDays,
  Link2,
  FileText,
  ExternalLink,
  NotebookPen
} from 'lucide-react';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';

const MEETING_TYPES = ['Online', 'Offline'];
const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

// 24hr 'HH:MM' -> '2:30 PM'
const formatTime = (t) => {
  if (!t) return '';

  const [hStr, mStr] = t.split(':');

  let h = parseInt(hStr, 10);

  const suffix = h >= 12 ? 'PM' : 'AM';

  h = h % 12 || 12;

  return `${h}:${mStr} ${suffix}`;
};

const Meetings = () => {
  const {
    currentUser,
    meetings,
    createMeeting,
    updateMeeting,
    addMeetingSummary,
    deleteMeeting,
    hasAccess
  } = useContext(AppContext);

  const confirm = useConfirm();

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
  // the 'meetings' Accessibility permission.
  if (
    currentUser.role !== 'OrgAdmin' &&
    !hasAccess('meetings')
  ) {
    return (
      <Navigate
        to="/staff/dashboard"
        replace
      />
    );
  }

  // ============================================================
  // CREATE / EDIT MODAL STATE
  // ============================================================

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] =
    useState(null);

  const [subject, setSubject] = useState('');
  const [meetingType, setMeetingType] =
    useState('Online');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [meetingLink, setMeetingLink] =
    useState('');

  const [status, setStatus] =
    useState('Upcoming');

  const [summary, setSummary] =
    useState('');

  const [formError, setFormError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  // ============================================================
  // SUMMARY MODAL
  // ============================================================

  const [summaryModalMeeting, setSummaryModalMeeting] =
    useState(null);

  const [summaryDraft, setSummaryDraft] =
    useState('');

  const [summarySaving, setSummarySaving] =
    useState(false);

  // ============================================================
  // FILTER
  // ============================================================

  const [typeFilter, setTypeFilter] =
    useState('All');

  // ============================================================
  // ORGANIZATION MEETINGS
  // ============================================================

  const orgMeetings = meetings.filter(
    m => m.orgId === currentUser.orgId
  );

  const visibleMeetings =
    typeFilter === 'All'
      ? orgMeetings
      : orgMeetings.filter(
          m => m.meetingType === typeFilter
        );

  const totalMeetings =
    orgMeetings.length;

  const upcomingCount =
    orgMeetings.filter(
      m => m.status === 'Upcoming'
    ).length;

  const completedCount =
    orgMeetings.filter(
      m => m.status === 'Completed'
    ).length;

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setSubject('');
    setMeetingType('Online');
    setDate('');
    setTime('');
    setMeetingLink('');
    setStatus('Upcoming');
    setSummary('');
    setFormError('');
  };

  // ============================================================
  // OPEN CREATE
  // ============================================================

  const openCreateModal = () => {
    setEditingMeetingId(null);

    resetForm();

    setModalOpen(true);
  };

  // ============================================================
  // OPEN EDIT
  // ============================================================

  const openEditModal = (meeting) => {
    setEditingMeetingId(meeting.id);

    setSubject(meeting.subject);

    setMeetingType(
      meeting.meetingType || 'Online'
    );

    setDate(meeting.date);

    setTime(meeting.time);

    setMeetingLink(
      meeting.meetingLink || ''
    );

    setStatus(
      meeting.status || 'Upcoming'
    );

    setSummary(
      meeting.summary || ''
    );

    setFormError('');

    setModalOpen(true);
  };

  // ============================================================
  // CREATE / UPDATE MEETING
  // ============================================================

  const handleSubmitMeeting = async (e) => {
    e.preventDefault();

    setFormError('');

    if (!subject || !date || !time) {
      setFormError(
        'Subject, date and time are required.'
      );

      return;
    }

    if (
      meetingType === 'Online' &&
      !meetingLink.trim()
    ) {
      setFormError(
        'A meeting link is required for online meetings.'
      );

      return;
    }

    setSaving(true);

    let res;

    if (editingMeetingId) {
      res = await updateMeeting(
        editingMeetingId,
        {
          subject,
          meetingType,
          date,
          time,
          meetingLink:
            meetingType === 'Online'
              ? meetingLink.trim()
              : meetingLink.trim(),
          status,
          summary
        }
      );
    } else {
      res = await createMeeting(
        subject,
        meetingType,
        date,
        time,
        meetingLink.trim()
      );
    }

    setSaving(false);

    if (!res.success) {
      setFormError(
        res.error ||
        'Could not save the meeting.'
      );

      return;
    }

    const wasCreating =
      !editingMeetingId;

    setEditingMeetingId(null);

    resetForm();

    setModalOpen(false);

    // Green success toast only after creating
    if (wasCreating) {
      showToast(
        'Success',
        'success'
      );
    }
  };

  // ============================================================
  // DELETE MEETING
  // ============================================================

  const handleDeleteMeeting = async (
    meeting
  ) => {
    const ok = await confirm({
      title: 'Delete this meeting?',
      message: `"${meeting.subject}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (!ok) return;

    const res =
      await deleteMeeting(meeting.id);

    if (res?.success !== false) {
      showToast(
        'Deleted',
        'error'
      );
    }
  };

  // ============================================================
  // MARK COMPLETED
  // ============================================================

  const handleMarkComplete = async (
    meeting
  ) => {
    await updateMeeting(
      meeting.id,
      {
        status: 'Completed'
      }
    );
  };

  // ============================================================
  // SUMMARY
  // ============================================================

  const openSummaryModal = (
    meeting
  ) => {
    setSummaryModalMeeting(meeting);

    setSummaryDraft(
      meeting.summary || ''
    );
  };

  const handleSaveSummary = async (
    e
  ) => {
    e.preventDefault();

    if (!summaryModalMeeting) return;

    setSummarySaving(true);

    await addMeetingSummary(
      summaryModalMeeting.id,
      summaryDraft.trim()
    );

    setSummarySaving(false);

    setSummaryModalMeeting(null);

    setSummaryDraft('');
  };

  // ============================================================
  // STATUS BADGE
  // ============================================================

  const statusBadgeClass = (s) =>
    s === 'Upcoming'
      ? 'bg-blue-100 text-blue-700'
      : s === 'Completed'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-200 text-gray-600';

  return (
    <DashboardLayout>

      {/* ========================================================
          TOAST
      ======================================================== */}

      {toast.show && (
        <div className="fixed top-6 right-6 z-[9999]">
          <div
            className={`flex items-center gap-3 min-w-[235px] rounded-2xl px-5 py-4 bg-white shadow-2xl border ${
              toast.type === 'success'
                ? 'border-green-200'
                : 'border-red-200'
            }`}
          >

            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                toast.type === 'success'
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}
            >
              <CheckCircle2
                size={21}
                className={
                  toast.type === 'success'
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              />
            </div>

            <div>
              <p className="font-bold text-gray-900">
                {toast.message}
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                {toast.type === 'success'
                  ? 'Meeting created successfully'
                  : 'Meeting deleted successfully'}
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
            Organization Meetings
          </h1>

          <p className="text-gray-600 mt-2">
            Schedule online or offline meetings with your organization members and
            keep a record of what was discussed once they're done.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg transition"
        >
          <Plus size={18} />
          Schedule Meeting
        </button>

      </div>

      {/* ========================================================
          MEETING ANALYTICS
      ======================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Meetings
          </p>

          <p className="text-3xl font-bold text-black mt-1">
            {totalMeetings}
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

        {['All', ...MEETING_TYPES].map(
          (type) => (
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
          )
        )}

      </div>

      {/* ========================================================
          MEETING CARDS
      ======================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {visibleMeetings.length > 0 ? (

          visibleMeetings.map(
            (meeting) => (

              <div
                key={meeting.id}
                className="bg-white border border-gray-200 rounded-xl shadow-md p-6"
              >

                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">

                  <h3 className="text-xl font-bold text-black">
                    {meeting.subject}
                  </h3>

                  <div className="flex items-center gap-1 shrink-0">

                    {meeting.status ===
                      'Upcoming' && (
                      <button
                        onClick={() =>
                          handleMarkComplete(
                            meeting
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
                        openEditModal(
                          meeting
                        )
                      }
                      title="Edit meeting"
                      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteMeeting(
                          meeting
                        )
                      }
                      title="Delete meeting"
                      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                </div>

                {/* Meeting Type */}
                <div className="flex items-center gap-2 mt-3 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 w-fit">
                  {meeting.meetingType ===
                  'Online' ? (
                    <Video size={12} />
                  ) : (
                    <MapPin size={12} />
                  )}

                  {meeting.meetingType}
                </div>

                {/* ==================================================
                    MODERN DATE + TIME
                ================================================== */}

                <div className="flex flex-wrap items-center gap-2 mt-4">

                  {/* Date */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">

                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                      <CalendarDays
                        size={16}
                        className="text-indigo-600"
                      />
                    </div>

                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
                        Date
                      </p>

                      <p className="text-xs font-extrabold text-gray-800">
                        {formatDMY(
                          meeting.date
                        )}
                      </p>
                    </div>

                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">

                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                      <Clock
                        size={16}
                        className="text-blue-600"
                      />
                    </div>

                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
                        Time
                      </p>

                      <p className="text-xs font-extrabold text-gray-800">
                        {formatTime(
                          meeting.time
                        )}
                      </p>
                    </div>

                  </div>

                  {/* Status */}
                  <span
                    className={`ml-auto px-3 py-2 rounded-xl text-xs font-bold ${statusBadgeClass(
                      meeting.status
                    )}`}
                  >
                    {meeting.status}
                  </span>

                </div>

                {/* Meeting Link */}
                {meeting.meetingType ===
                  'Online' &&
                  meeting.meetingLink && (
                    <a
                      href={
                        meeting.meetingLink
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline w-fit"
                    >
                      <Link2 size={14} />

                      Join Meeting Link

                      <ExternalLink
                        size={12}
                      />
                    </a>
                  )}

                {/* Summary */}
                {meeting.summary ? (

                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">

                    <div className="flex items-center gap-2 text-xs font-bold text-green-700 mb-1.5">
                      <FileText
                        size={13}
                      />

                      Meeting Summary
                    </div>

                    <p className="text-sm text-gray-700">
                      {meeting.summary}
                    </p>

                  </div>

                ) : meeting.status ===
                  'Completed' ? (

                  <button
                    onClick={() =>
                      openSummaryModal(
                        meeting
                      )
                    }
                    className="flex items-center gap-2 mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 w-fit"
                  >
                    <NotebookPen
                      size={14}
                    />

                    Add Meeting Summary
                  </button>

                ) : (

                  <p className="text-gray-400 mt-4 text-sm italic">
                    Summary can be added once this meeting is completed.
                  </p>

                )}

              </div>

            )
          )

        ) : (

          <div className="col-span-full bg-white border rounded-xl p-16 text-center shadow">

            <Video
              size={45}
              className="mx-auto text-gray-500 mb-4"
            />

            <h3 className="text-xl font-bold text-black">
              No Meetings Yet
            </h3>

            <p className="text-gray-600 mt-2">
              Click "Schedule Meeting" to set up your first organization meeting.
            </p>

          </div>

        )}

      </div>

      {/* ========================================================
          CREATE / EDIT MEETING MODAL
      ======================================================== */}

      {modalOpen && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold text-black">
                {editingMeetingId
                  ? 'Edit Meeting'
                  : 'Schedule New Meeting'}
              </h2>

              <button
                onClick={() =>
                  setModalOpen(false)
                }
                className="text-gray-500 hover:text-red-600 text-xl font-bold"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={handleSubmitMeeting}
              className="space-y-5"
            >

              {/* Subject */}
              <div>

                <label className="block font-semibold text-black mb-2">
                  Subject
                </label>

                <input
                  type="text"
                  value={subject}
                  onChange={(e) =>
                    setSubject(
                      e.target.value
                    )
                  }
                  placeholder="Monthly Progress Review"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* Meeting Type */}
              <div>

                <label className="block font-semibold text-black mb-2">
                  Meeting Type
                </label>

                <select
                  value={meetingType}
                  onChange={(e) =>
                    setMeetingType(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >

                  {MEETING_TYPES.map(
                    (type) => (
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
              {editingMeetingId && (

                <div>

                  <label className="block font-semibold text-black mb-2">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    {MEETING_STATUSES.map(
                      (s) => (
                        <option
                          key={s}
                          value={s}
                        >
                          {s}
                        </option>
                      )
                    )}

                  </select>

                </div>

              )}

              {/* ==================================================
                  DATE + TIME
              ================================================== */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Date */}
                <div>

                  <label className="block font-semibold text-black mb-2">
                    Date
                  </label>

                  <div className="relative">

                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <CalendarDays
                        size={18}
                        className="text-indigo-500"
                      />
                    </div>

                    <div className="[&_input]:w-full [&_input]:h-12 [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:bg-gradient-to-br [&_input]:from-white [&_input]:to-indigo-50/50 [&_input]:pl-11 [&_input]:pr-4 [&_input]:font-semibold [&_input]:text-gray-800 [&_input]:shadow-sm [&_input]:outline-none">
                      <DateInputDMY
                        value={date}
                        onChange={setDate}
                        required
                      />
                    </div>

                  </div>

                </div>

                {/* Time */}
                <div>

                  <label className="block font-semibold text-black mb-2">
                    Time
                  </label>

                  <div className="relative">

                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <Clock
                        size={18}
                        className="text-blue-500"
                      />
                    </div>

                    <input
                      type="time"
                      value={time}
                      onChange={(e) =>
                        setTime(
                          e.target.value
                        )
                      }
                      required
                      className="w-full h-12 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/50 pl-11 pr-4 text-sm font-semibold text-gray-800 shadow-sm outline-none transition-all hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white cursor-pointer"
                    />

                  </div>

                </div>

              </div>

              {/* Meeting Link */}
              <div>

                <label className="block font-semibold text-black mb-2">

                  Meeting Link{' '}

                  {meetingType ===
                    'Online' && (
                    <span className="text-red-500">
                      *
                    </span>
                  )}

                  {meetingType ===
                    'Offline' && (
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  )}

                </label>

                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) =>
                    setMeetingLink(
                      e.target.value
                    )
                  }
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  required={
                    meetingType ===
                    'Online'
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* Summary */}
              {editingMeetingId && (

                <div>

                  <label className="block font-semibold text-black mb-2">

                    Meeting Summary{' '}

                    <span className="text-gray-400 font-normal">
                      (add once completed)
                    </span>

                  </label>

                  <textarea
                    rows={3}
                    value={summary}
                    onChange={(e) =>
                      setSummary(
                        e.target.value
                      )
                    }
                    placeholder="Discussed the organization's upcoming projects, pending requests, and next month's action plan."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              )}

              {/* Error */}
              {formError && (

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {formError}
                </div>

              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                📢 <strong>Heads up:</strong> Saving this meeting will make it visible to
                all relevant organization members and broadcast a notification.
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(false)
                  }
                  className="px-5 py-2 rounded-lg border border-gray-300 bg-gray-100 text-black font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingMeetingId
                    ? 'Save Changes'
                    : 'Schedule Meeting'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ========================================================
          ADD / EDIT SUMMARY MODAL
      ======================================================== */}

      {summaryModalMeeting && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold text-black">
                Meeting Summary
              </h2>

              <button
                onClick={() =>
                  setSummaryModalMeeting(
                    null
                  )
                }
                className="text-gray-500 hover:text-red-600 text-xl font-bold"
              >
                ✕
              </button>

            </div>

            <p className="text-sm text-gray-600 mb-4">
              {summaryModalMeeting.subject}
              {' — '}
              {formatDMY(
                summaryModalMeeting.date
              )}
              {', '}
              {formatTime(
                summaryModalMeeting.time
              )}
            </p>

            <form
              onSubmit={
                handleSaveSummary
              }
              className="space-y-5"
            >

              <div>

                <label className="block font-semibold text-black mb-2">
                  What was discussed?
                </label>

                <textarea
                  rows={4}
                  value={summaryDraft}
                  onChange={(e) =>
                    setSummaryDraft(
                      e.target.value
                    )
                  }
                  placeholder="Discussed the organization's upcoming projects, pending requests, and next month's action plan."
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              <div className="flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setSummaryModalMeeting(
                      null
                    )
                  }
                  className="px-5 py-2 rounded-lg border border-gray-300 bg-gray-100 text-black font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={summarySaving}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60"
                >
                  {summarySaving
                    ? 'Saving...'
                    : 'Save Summary'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </DashboardLayout>
  );
};

export default Meetings;