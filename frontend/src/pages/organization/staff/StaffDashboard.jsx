import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import TaskThreadModal from '../../../shared/TaskThreadModal/TaskThreadModal';
import { formatDMY } from '../../../shared/DateInputDMY/DateInputDMY';

import {
  CheckSquare,
  Calendar,
  Bell,
  Megaphone,
  Briefcase,
  MessageCircle,
  Video,
  MapPin,
  Clock,
  ExternalLink,
  Link2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  PlayCircle,
  XCircle
} from 'lucide-react';

const StaffDashboard = () => {
  const {
    currentUser,
    tasks,
    updateTaskStatus,
    camps,
    availability,
    updateAvailability,
    notifications,
    organizations,
    meetings,

    // PROJECTS
    getMyProjectAssignments,
    updateProjectAssignmentStatus
  } = useContext(AppContext);

  const myOrg = organizations.find(
    (o) => o.id === currentUser?.orgId
  );

  const subscription = myOrg?.subscription || null;

  const [openTaskId, setOpenTaskId] = useState(null);

  // =========================
  // PROJECT STATE
  // =========================
  const [myProjects, setMyProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectActionId, setProjectActionId] = useState(null);
  const [projectError, setProjectError] = useState('');

  // =========================
  // TASKS
  // =========================
  const myTasks = tasks.filter(
    (t) => t.assignedToId === currentUser?.id
  );

  const openTask =
    myTasks.find((t) => t.id === openTaskId) || null;

  // =========================
  // CAMPS
  // =========================
  const upcomingCamps = camps.filter(
    (c) => c.status === 'Upcoming'
  );

  // =========================
  // MEETINGS
  // =========================
  const upcomingMeetings = meetings
    .filter(
      (m) =>
        m.orgId === currentUser?.orgId &&
        m.status === 'Upcoming'
    )
    .sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );

  // =========================
  // LOAD MY PROJECTS
  // =========================
  const loadMyProjects = async () => {
    if (!currentUser?.id || !getMyProjectAssignments) {
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    setProjectError('');

    try {
      const res = await getMyProjectAssignments();

      if (res?.success) {
        setMyProjects(res.projects || []);
      } else {
        setProjectError(
          res?.error || 'Could not load your projects.'
        );
      }
    } catch (error) {
      console.error('Failed to load projects:', error);

      setProjectError(
        'Could not load your assigned projects.'
      );
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    loadMyProjects();
  }, [currentUser?.id]);

  // =========================
  // TIME FORMAT
  // =========================
  const formatTime = (t) => {
    if (!t) return '';

    const [hStr, mStr] = t.split(':');

    let h = parseInt(hStr, 10);

    const suffix = h >= 12 ? 'PM' : 'AM';

    h = h % 12 || 12;

    return `${h}:${mStr} ${suffix}`;
  };

  // =========================
  // NOTIFICATIONS
  // =========================
  const relevantToMe = (n) =>
    n.orgId === currentUser?.orgId &&
    (n.targetRole === 'All' ||
      n.targetRole === currentUser?.role);

  const myAnnouncements = notifications.filter(
    (n) =>
      relevantToMe(n) &&
      n.type === 'Announcement'
  );

  const myNotifications = notifications.filter(
    (n) =>
      relevantToMe(n) &&
      n.type !== 'Announcement'
  );

  // =========================
  // CAMP AVAILABILITY
  // =========================
  const getCampAvailabilityStatus = (campId) => {
    const record = availability.find(
      (a) =>
        a.campId === campId &&
        a.userId === currentUser?.id
    );

    return record
      ? record.status
      : 'Not Responded';
  };

  // =========================
  // TASK ACTION
  // =========================
  const handleTaskAction = (
    taskId,
    currentStatus
  ) => {
    let nextStatus = 'Accepted';

    if (currentStatus === 'Accepted') {
      nextStatus = 'In Progress';
    } else if (currentStatus === 'In Progress') {
      nextStatus = 'Completed';
    }

    updateTaskStatus(taskId, nextStatus);
  };

  // =========================
  // PROJECT STATUS
  // =========================
  const getProjectStatus = (project) => {
    return (
      project.assignment?.projectStatus ||
      project.assignment?.status ||
      'Pending'
    );
  };

  const getProjectStatusClass = (status) => {
    switch (status) {
      case 'Accepted':
        return 'bg-blue-100 text-blue-700 border-blue-200';

      case 'In Progress':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';

      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-200';

      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  // =========================
  // PROJECT ACTION
  // =========================
  const handleProjectStatus = async (
    project,
    nextStatus
  ) => {
    if (!updateProjectAssignmentStatus) return;

    setProjectActionId(project.id);
    setProjectError('');

    try {
      const res =
        await updateProjectAssignmentStatus(
          project.id,
          nextStatus
        );

      if (res?.success) {
        setMyProjects((prev) =>
          prev.map((p) => {
            if (p.id !== project.id) {
              return p;
            }

            return {
              ...p,
              assignment: {
                ...p.assignment,
                projectStatus: nextStatus
              }
            };
          })
        );
      } else {
        setProjectError(
          res?.error ||
            'Could not update project status.'
        );
      }
    } catch (error) {
      console.error(
        'Project status update failed:',
        error
      );

      setProjectError(
        'Could not update project status.'
      );
    } finally {
      setProjectActionId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 min-h-full text-black p-6 -m-8 md:p-8">

        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 p-7 shadow-xl mb-6">

          <div className="absolute -right-10 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />

          <div className="relative">

            <h1 className="text-2xl font-bold text-white">
              Workspace Dashboard{' '}
              <span className="text-indigo-100 font-medium">
                ({currentUser?.role})
              </span>
            </h1>

            <p className="text-sm text-indigo-100 mt-1">
              Manage tasks, projects, camps &amp; field
              operations in one place.
            </p>

          </div>
        </div>

        {/* ========================================= */}
        {/* PAYMENT WARNING */}
        {/* ========================================= */}

        {subscription?.operationsBlocked && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">

            <div className="bg-red-100 text-red-600 rounded-xl p-2.5 shrink-0">
              <AlertCircle size={20} />
            </div>

            <div>
              <p className="font-bold text-red-800">
                Organization Payment Overdue
              </p>

              <p className="text-sm text-red-700 mt-1 leading-6">
                Your organization's subscription payment
                is overdue by{' '}
                {subscription.overdueDays} day
                {subscription.overdueDays === 1
                  ? ''
                  : 's'}
                . Some actions are paused until your
                organization admin completes payment.
                Your existing data is safe and unaffected.
              </p>
            </div>

          </div>
        )}

        {/* ========================================= */}
        {/* MAIN GRID */}
        {/* ========================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

          {/* ======================================= */}
          {/* LEFT SIDE */}
          {/* ======================================= */}

          <div className="lg:col-span-2 space-y-6">

            {/* ===================================== */}
            {/* MY TASKS */}
            {/* ===================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">

              <div className="flex items-center gap-2 mb-4">

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-1.5">
                  <CheckSquare size={16} />
                </div>

                <h2 className="text-lg font-semibold">
                  My Assigned Tasks
                </h2>

              </div>

              <div className="space-y-3">

                {myTasks.length > 0 ? (

                  myTasks.map((t) => {

                    const statusStyle =
                      t.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : t.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-700'
                        : t.status === 'Accepted'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700';

                    return (

                      <div
                        key={t.id}
                        onClick={() =>
                          setOpenTaskId(t.id)
                        }
                        className="flex justify-between items-center border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition cursor-pointer"
                      >

                        <div className="space-y-1">

                          <div className="flex items-center gap-2 flex-wrap">

                            <h3 className="font-medium">
                              {t.title}
                            </h3>

                            <span
                              className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle}`}
                            >
                              {t.status}
                            </span>

                            <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                              <MessageCircle size={12} />
                              Discuss
                            </span>

                            {t.hasUnreadForAssignee && (
                              <span className="flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                New reply
                              </span>
                            )}

                          </div>

                          <p className="text-sm text-gray-500">
                            {t.description}
                          </p>

                          <p className="text-xs text-gray-400">
                            Due: {t.dueDate}
                          </p>

                        </div>

                        <div>

                          {t.status !== 'Completed' ? (

                            <button
                              onClick={(e) => {
                                e.stopPropagation();

                                handleTaskAction(
                                  t.id,
                                  t.status
                                );
                              }}
                              className="bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
                            >
                              Next Step
                            </button>

                          ) : (

                            <span className="text-green-600 text-sm font-medium">
                              ✓ Completed
                            </span>

                          )}

                        </div>

                      </div>

                    );
                  })

                ) : (

                  <p className="text-gray-400 text-sm text-center py-6">
                    No tasks assigned yet.
                  </p>

                )}

              </div>
            </div>

            {/* ===================================== */}
            {/* MY PROJECTS */}
            {/* ===================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">

              <div className="flex items-center justify-between mb-5">

                <div className="flex items-center gap-2">

                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg p-1.5">
                    <Briefcase size={16} />
                  </div>

                  <h2 className="text-lg font-semibold">
                    My Projects
                  </h2>

                </div>

                <div className="flex items-center gap-2">

                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                    {myProjects.length}
                  </span>

                  <button
                    onClick={loadMyProjects}
                    disabled={projectsLoading}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50"
                    title="Refresh projects"
                  >
                    <RefreshCw
                      size={15}
                      className={
                        projectsLoading
                          ? 'animate-spin'
                          : ''
                      }
                    />
                  </button>

                </div>

              </div>

              {/* PROJECT ERROR */}

              {projectError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {projectError}
                </div>
              )}

              {/* PROJECT LOADING */}

              {projectsLoading ? (

                <div className="space-y-3">

                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse border border-gray-100 rounded-xl p-4 bg-gray-50"
                    >
                      <div className="h-5 w-1/2 bg-gray-200 rounded mb-3" />
                      <div className="h-3 w-full bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-2/3 bg-gray-200 rounded" />
                    </div>
                  ))}

                </div>

              ) : myProjects.length > 0 ? (

                <div className="space-y-4">

                  {myProjects.map((project) => {

                    const status =
                      getProjectStatus(project);

                    const isProcessing =
                      projectActionId === project.id;

                    return (

                      <div
                        key={project.id}
                        className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition"
                      >

                        {/* PROJECT HEADER */}

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <h3 className="font-semibold text-gray-900 text-base">
                              {project.title}
                            </h3>

                            {project.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                                {project.description}
                              </p>
                            )}

                          </div>

                          <span
                            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${getProjectStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>

                        </div>

                        {/* PROJECT DETAILS */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs text-gray-500">

                          {project.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={13} />
                              {project.location}
                            </span>
                          )}

                          {project.startDate && (
                            <span className="flex items-center gap-1.5">
                              <Calendar size={13} />

                              {project.startDate}

                              {project.endDate
                                ? ` → ${project.endDate}`
                                : ''}
                            </span>
                          )}

                          {project.assignment?.roleOnEntity && (
                            <span className="flex items-center gap-1.5">
                              <Briefcase size={13} />
                              Role:{' '}
                              {
                                project.assignment
                                  .roleOnEntity
                              }
                            </span>
                          )}

                          {project.budget && (
                            <span className="flex items-center gap-1.5">
                              💰 Budget:{' '}
                              {Number(
                                project.budget
                              ).toLocaleString()}
                            </span>
                          )}

                        </div>

                        {/* OBJECTIVES */}

                        {project.objectives && (
                          <div className="mt-3 rounded-lg bg-white border border-gray-100 p-3">

                            <p className="text-xs font-bold text-gray-700 mb-1">
                              Objectives
                            </p>

                            <p className="text-xs text-gray-500 line-clamp-3">
                              {project.objectives}
                            </p>

                          </div>
                        )}

                        {/* ACTIONS */}

                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-200">

                          {/* PENDING */}

                          {status === 'Pending' && (

                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                handleProjectStatus(
                                  project,
                                  'Accepted'
                                )
                              }
                              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
                            >

                              <CheckCircle2
                                size={14}
                              />

                              {isProcessing
                                ? 'Accepting...'
                                : 'Accept Project'}

                            </button>

                          )}

                          {/* ACCEPTED */}

                          {status === 'Accepted' && (

                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                handleProjectStatus(
                                  project,
                                  'In Progress'
                                )
                              }
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                            >

                              <PlayCircle
                                size={14}
                              />

                              {isProcessing
                                ? 'Starting...'
                                : 'Start Working'}

                            </button>

                          )}

                          {/* IN PROGRESS */}

                          {status === 'In Progress' && (

                            <>
                              <span className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg">
                                <PlayCircle
                                  size={14}
                                />
                                Working on Project
                              </span>

                              <button
                                disabled={isProcessing}
                                onClick={() =>
                                  handleProjectStatus(
                                    project,
                                    'Completed'
                                  )
                                }
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-60"
                              >

                                <CheckCircle2
                                  size={14}
                                />

                                {isProcessing
                                  ? 'Completing...'
                                  : 'Mark Completed'}

                              </button>
                            </>

                          )}

                          {/* COMPLETED */}

                          {status === 'Completed' && (

                            <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg">
                              <CheckCircle2
                                size={14}
                              />
                              Project Completed
                            </span>

                          )}

                        </div>

                        {/* STAFF ROLE */}

                        {project.assignment?.roleOnEntity && (
                          <p className="text-[11px] text-gray-400 mt-3">
                            You were assigned as{' '}
                            <span className="font-semibold text-gray-600">
                              {
                                project.assignment
                                  .roleOnEntity
                              }
                            </span>
                          </p>
                        )}

                      </div>

                    );
                  })}

                </div>

              ) : (

                <div className="text-center py-8">

                  <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3">
                    <Briefcase size={22} />
                  </div>

                  <p className="text-sm font-medium text-gray-600">
                    No projects assigned to you yet.
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Projects assigned by your organization
                    admin will appear here.
                  </p>

                </div>

              )}

            </div>

          </div>

          {/* ======================================= */}
          {/* RIGHT SIDE */}
          {/* ======================================= */}

          <div className="space-y-6">

            {/* ===================================== */}
            {/* ANNOUNCEMENTS */}
            {/* ===================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">

              <div className="flex items-center gap-2 mb-4">

                <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-lg p-1.5">
                  <Megaphone size={16} />
                </div>

                <h2 className="text-lg font-semibold">
                  Announcements
                </h2>

              </div>

              <div className="space-y-3">

                {myAnnouncements.length > 0 ? (

                  myAnnouncements.map((a) => (

                    <div
                      key={a.id}
                      className="p-3 rounded-xl border border-pink-100 bg-pink-50/60 hover:bg-pink-50 transition"
                    >

                      <p className="font-medium text-sm text-gray-900">
                        {a.title}
                      </p>

                      <p className="text-xs text-gray-600 mt-1">
                        {a.message}
                      </p>

                    </div>

                  ))

                ) : (

                  <p className="text-sm text-gray-400 text-center py-6">
                    No announcements from your
                    organization yet.
                  </p>

                )}

              </div>

            </div>

            {/* ===================================== */}
            {/* UPCOMING CAMPS */}
            {/* ===================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">

              <div className="flex items-center gap-2 mb-4">

                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg p-1.5">
                  <Calendar size={16} />
                </div>

                <h2 className="text-lg font-semibold">
                  Upcoming Camps
                </h2>

              </div>

              <div className="space-y-3">

                {upcomingCamps.length > 0 ? (

                  upcomingCamps.map((c) => {

                    const status =
                      getCampAvailabilityStatus(
                        c.id
                      );

                    return (

                      <div
                        key={c.id}
                        className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:shadow-sm transition"
                      >

                        <h3 className="font-medium">
                          {c.title}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          {c.location} • {c.date}
                        </p>

                        <div className="flex gap-2 mt-3 flex-wrap">

                          {[
                            'Available',
                            'Maybe',
                            'NotAvailable'
                          ].map((s) => (

                            <button
                              key={s}
                              onClick={() =>
                                updateAvailability(
                                  c.id,
                                  currentUser.id,
                                  s
                                )
                              }
                              className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                                status === s
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                              }`}
                            >
                              {s}
                            </button>

                          ))}

                        </div>

                      </div>

                    );

                  })

                ) : (

                  <p className="text-sm text-gray-400 text-center py-6">
                    No upcoming camps
                  </p>

                )}

              </div>

            </div>

            {/* ===================================== */}
            {/* UPCOMING MEETINGS */}
            {/* ===================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">

              <div className="flex items-center gap-2 mb-4">

                <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white rounded-lg p-1.5">
                  <Video size={16} />
                </div>

                <h2 className="text-lg font-semibold">
                  Upcoming Meetings
                </h2>

              </div>

              <div className="space-y-3">

                {upcomingMeetings.length > 0 ? (

                  upcomingMeetings.map((m) => (

                    <div
                      key={m.id}
                      className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:shadow-sm transition"
                    >

                      <div className="flex items-start justify-between gap-2">

                        <h3 className="font-medium">
                          {m.subject}
                        </h3>

                        <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 shrink-0">

                          {m.meetingType ===
                          'Online' ? (
                            <Video size={11} />
                          ) : (
                            <MapPin size={11} />
                          )}

                          {m.meetingType}

                        </span>

                      </div>

                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <Clock size={12} />

                        {formatDMY(m.date)}

                        {' • '}

                        {formatTime(m.time)}
                      </p>

                      {m.meetingType ===
                        'Online' &&
                        m.meetingLink && (

                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline w-fit"
                          >

                            <Link2 size={12} />

                            Join Meeting Link

                            <ExternalLink
                              size={10}
                            />

                          </a>

                        )}

                    </div>

                  ))

                ) : (

                  <p className="text-sm text-gray-400 text-center py-6">
                    No upcoming meetings
                  </p>

                )}

              </div>

            </div>

            {/* ===================================== */}
            {/* NOTIFICATIONS */}
            {/* ===================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">

              <div className="flex items-center gap-2 mb-4">

                <div className="bg-gradient-to-br from-slate-500 to-slate-700 text-white rounded-lg p-1.5">
                  <Bell size={16} />
                </div>

                <h2 className="text-lg font-semibold">
                  Notifications
                </h2>

              </div>

              <div className="space-y-3">

                {myNotifications.length > 0 ? (

                  myNotifications.map((n) => (

                    <div
                      key={n.id}
                      className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition"
                    >

                      <p className="font-medium text-sm text-gray-900">
                        {n.title}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {n.message}
                      </p>

                    </div>

                  ))

                ) : (

                  <p className="text-sm text-gray-400 text-center py-6">
                    No notifications
                  </p>

                )}

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ========================================= */}
      {/* TASK THREAD */}
      {/* ========================================= */}

      {openTask && (
        <TaskThreadModal
          task={openTask}
          onClose={() =>
            setOpenTaskId(null)
          }
        />
      )}

    </DashboardLayout>
  );
};

export default StaffDashboard;
