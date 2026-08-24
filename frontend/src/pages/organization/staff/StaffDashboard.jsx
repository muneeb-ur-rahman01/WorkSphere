import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import TaskThreadModal from '../../../shared/TaskThreadModal/TaskThreadModal';
import { formatDMY } from '../../../shared/DateInputDMY/DateInputDMY';
import { SUBSCRIPTION_PLANS } from '../../../Config/constant';

import {
  CheckSquare, Calendar, Bell, Mic, Square, Megaphone,
  CircleDot, CheckCircle2, ChevronRight, Activity, Loader2, AlertCircle, MessageCircle,
  Video, MapPin, Clock, ExternalLink, Link2
} from 'lucide-react';

const StaffDashboard = () => {
  const {
    currentUser, tasks, updateTaskStatus,
    camps, availability, updateAvailability, notifications,
    transcribePrescription, organizations, meetings
  } = useContext(AppContext);

  const myOrg = organizations.find(o => o.id === currentUser.orgId);
  const subscription = myOrg?.subscription || null;
  const planKey = myOrg?.subPlan && SUBSCRIPTION_PLANS[myOrg.subPlan] ? myOrg.subPlan : 'Basic';
  const aiFeatureAvailable = subscription?.subscriptionStatus === 'Active' && SUBSCRIPTION_PLANS[planKey]?.aiFeatures;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [structuredPrescription, setStructuredPrescription] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [openTaskId, setOpenTaskId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id);
  const openTask = myTasks.find(t => t.id === openTaskId) || null;
  const upcomingCamps = camps.filter(c => c.status === 'Upcoming');
  const upcomingMeetings = meetings
    .filter(m => m.orgId === currentUser.orgId && m.status === 'Upcoming')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // 24hr 'HH:MM' -> '2:30 PM' for display, without pulling in a date library
  const formatTime = (t) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr} ${suffix}`;
  };

  const relevantToMe = (n) =>
    n.orgId === currentUser.orgId &&
    (n.targetRole === 'All' || n.targetRole === currentUser.role);

  // Org-admin announcements, shown in their own dedicated section
  const myAnnouncements = notifications.filter(n => relevantToMe(n) && n.type === 'Announcement');
  // Everything else (task/camp/system notices)
  const myNotifications = notifications.filter(n => relevantToMe(n) && n.type !== 'Announcement');

  const getCampAvailabilityStatus = (campId) => {
    const record = availability.find(a => a.campId === campId && a.userId === currentUser.id);
    return record ? record.status : 'Not Responded';
  };

  const handleTaskAction = (taskId, currentStatus) => {
    let nextStatus = "Accepted";

    if (currentStatus === "Accepted") {
      nextStatus = "In Progress";
    } else if (currentStatus === "In Progress") {
      nextStatus = "Completed";
    }

    updateTaskStatus(taskId, nextStatus);
  };

  // Real AI voice dictation: records mic audio in the browser, sends it to our
  // backend, which forwards it to Gemini for transcription + structuring.
  const handleStartVoiceRecording = async () => {
    setRecordingError('');
    setStructuredPrescription(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const preferredMimeType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(
        (type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)
      );

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(timerRef.current);
        setElapsedSeconds(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });

        if (audioBlob.size < 500) {
          setRecordingError('Recording was too short. Please try again.');
          return;
        }

        setIsProcessing(true);
        const res = await transcribePrescription(audioBlob);
        setIsProcessing(false);

        if (res.success) {
          setStructuredPrescription(res.prescription);
        } else {
          setRecordingError(res.error || 'AI transcription failed. Please try again.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setRecordingError('Microphone access was denied or is unavailable. Please allow mic permissions and try again.');
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <DashboardLayout>
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 min-h-full text-black p-6 -m-8 md:p-8">

        {/* HEADER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 p-7 shadow-xl mb-6">
          <div className="absolute -right-10 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-white">
              Workspace Dashboard <span className="text-indigo-100 font-medium">({currentUser.role})</span>
            </h1>
            <p className="text-sm text-indigo-100 mt-1">
              Manage tasks, camps & AI clinical tools in one place.
            </p>
          </div>
        </div>

        {subscription?.operationsBlocked && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
            <div className="bg-red-100 text-red-600 rounded-xl p-2.5 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-red-800">Organization Payment Overdue</p>
              <p className="text-sm text-red-700 mt-1 leading-6">
                Your organization's subscription payment is overdue by {subscription.overdueDays} day{subscription.overdueDays === 1 ? '' : 's'}.
                Some actions (creating tasks, camps, or events) are paused until your organization admin completes payment.
                Your existing data is safe and unaffected.
              </p>
            </div>
          </div>
        )}

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">

            {/* TASK CARD */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-1.5">
                  <CheckSquare size={16} />
                </div>
                <h2 className="text-lg font-semibold">My Assigned Tasks</h2>
              </div>

              <div className="space-y-3">
                {myTasks.length > 0 ? (
                  myTasks.map((t) => {
                    const statusStyle =
                      t.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : t.status === "In Progress"
                        ? "bg-blue-100 text-blue-700"
                        : t.status === "Accepted"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700";

                    return (
                      <div
                        key={t.id}
                        onClick={() => setOpenTaskId(t.id)}
                        className="flex justify-between items-center border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{t.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle}`}>
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
                          {t.status !== "Completed" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskAction(t.id, t.status);
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

            {/* AI VOICE CARD — clinical/field tool, not shown to Membership-tier users
                (their org role doesn't include clinical duties; backend also blocks this endpoint for them).
                Also requires an active Premium subscription — see requireFeature() on
                the backend, which is the actual enforcement; this just mirrors it in the UI. */}
            {currentUser.role !== 'Membership' && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-1.5">
                    <Mic size={16} />
                  </div>
                  <h2 className="text-lg font-semibold">AI Clinical Voice Assistant</h2>
                </div>

                {!aiFeatureAvailable ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
                    AI voice dictation is a <strong>Premium plan</strong> feature. Ask your organization admin to
                    upgrade the subscription to unlock it.
                  </div>
                ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                    disabled={isProcessing}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                      isRecording
                        ? "bg-red-500 animate-pulse"
                        : "bg-gradient-to-br from-indigo-600 to-purple-600 hover:scale-105"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : isRecording ? (
                      <Square size={20} />
                    ) : (
                      <Mic size={22} />
                    )}
                  </button>

                  <div>
                    <p className="font-medium">
                      {isProcessing
                        ? "Transcribing with AI..."
                        : isRecording
                        ? `Listening... ${formatElapsed(elapsedSeconds)} (tap to stop)`
                        : "Tap to start recording"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Dictate a prescription and let AI structure it automatically
                    </p>
                  </div>
                </div>
                )}

                {recordingError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {recordingError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">

            {/* ANNOUNCEMENTS */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-lg p-1.5">
                  <Megaphone size={16} />
                </div>
                <h2 className="text-lg font-semibold">Announcements</h2>
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
                    No announcements from your organization yet.
                  </p>
                )}
              </div>
            </div>

            {/* UPCOMING CAMPS */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg p-1.5">
                  <Calendar size={16} />
                </div>
                <h2 className="text-lg font-semibold">Upcoming Camps</h2>
              </div>

              <div className="space-y-3">
                {upcomingCamps.length > 0 ? (
                  upcomingCamps.map((c) => {
                    const status = getCampAvailabilityStatus(c.id);

                    return (
                      <div
                        key={c.id}
                        className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:shadow-sm transition"
                      >
                        <h3 className="font-medium">{c.title}</h3>

                        <p className="text-sm text-gray-500 mt-1">
                          {c.location} • {c.date}
                        </p>

                        <div className="flex gap-2 mt-3 flex-wrap">
                          {["Available", "Maybe", "NotAvailable"].map((s) => (
                            <button
                              key={s}
                              onClick={() =>
                                updateAvailability(c.id, currentUser.id, s)
                              }
                              className={`text-xs px-3 py-1 rounded-full border font-medium transition ${
                                status === s
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
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

            {/* UPCOMING MEETINGS */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white rounded-lg p-1.5">
                  <Video size={16} />
                </div>
                <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
              </div>

              <div className="space-y-3">
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map((m) => (
                    <div
                      key={m.id}
                      className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium">{m.subject}</h3>
                        <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 shrink-0">
                          {m.meetingType === 'Online' ? <Video size={11} /> : <MapPin size={11} />}
                          {m.meetingType}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <Clock size={12} />
                        {formatDMY(m.date)} • {formatTime(m.time)}
                      </p>

                      {m.meetingType === 'Online' && m.meetingLink && (
                        <a
                          href={m.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline w-fit"
                        >
                          <Link2 size={12} />
                          Join Meeting Link
                          <ExternalLink size={10} />
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

            {/* NOTIFICATIONS */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-slate-500 to-slate-700 text-white rounded-lg p-1.5">
                  <Bell size={16} />
                </div>
                <h2 className="text-lg font-semibold">Notifications</h2>
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

        {/* AI OUTPUT */}
        {structuredPrescription && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5">
            <h2 className="text-green-700 font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} />
              AI Generated Prescription
            </h2>

            <div className="text-sm space-y-2 text-gray-700">
              <p>
                Patient:{" "}
                <span className="font-medium">
                  {structuredPrescription.patientName || 'Not mentioned'}
                </span>
              </p>

              <div>
                <p className="font-medium mt-2">Medicines:</p>
                {structuredPrescription.medicines.length > 0 ? (
                  <ul className="list-disc ml-5 text-gray-600">
                    {structuredPrescription.medicines.map((m, i) => (
                      <li key={i}>
                        {m.name} — {m.dosage}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-xs mt-1">No medicines detected.</p>
                )}
              </div>

              {structuredPrescription.advice && (
                <p className="mt-2">
                  Advice:{" "}
                  <span className="text-gray-600">
                    {structuredPrescription.advice}
                  </span>
                </p>
              )}

              {structuredPrescription.rawTranscript && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="font-medium text-xs text-gray-500 mb-1">Full Transcript</p>
                  <p className="text-xs text-gray-500 italic">"{structuredPrescription.rawTranscript}"</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {openTask && (
        <TaskThreadModal task={openTask} onClose={() => setOpenTaskId(null)} />
      )}

    </DashboardLayout>
  );
};

export default StaffDashboard;
