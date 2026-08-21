import React, { useContext, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import TaskThreadModal from '../../../shared/TaskThreadModal/TaskThreadModal';
import { CheckSquare, Plus, Clock, Play, CheckCircle, MessageCircle } from 'lucide-react';

const Tasks = () => {
  const { currentUser, tasks, createTask, users } = useContext(AppContext);

  // Task Thread modal state
  const [openTaskId, setOpenTaskId] = useState(null);
  const openTask = tasks.find(t => t.id === openTaskId) || null;

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');

  const getStatusBadge = (status) => {
  switch (status) {
    case "Pending":
      return "bg-red-100 text-red-600";

    case "Accepted":
      return "bg-yellow-100 text-yellow-700";

    case "In Progress":
      return "bg-blue-100 text-blue-700";

    case "Completed":
      return "bg-green-100 text-green-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
};

  // Filter tasks belonging to this organization
  const orgTasks = tasks.filter(t => t.orgId === currentUser.orgId);

  // Filter active staff of this organization to populate dropdown
  const orgStaff = users.filter(u => u.orgId === currentUser.orgId && u.status === 'Active' && u.role !== 'OrgAdmin');

  const handleSubmitTask = (e) => {
    e.preventDefault();
    if (!taskTitle || !assigneeId || !dueDate) return;

    createTask(taskTitle, taskDesc, assigneeId, priority, dueDate);

    // Reset and close
    setTaskTitle('');
    setTaskDesc('');
    setAssigneeId('');
    setPriority('Medium');
    setDueDate('');
    setModalOpen(false);
  };

  const getAssigneeName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.fullName} (${user.role})` : 'Unassigned';
  };

  // Shared card renderer used across all 4 status columns below - clicking
  // anywhere on the card opens the discussion thread for that task, and a
  // red "New" badge appears if the assignee has left an unread comment/reply.
  const renderTaskCard = (t) => (
    <div
      key={t.id}
      onClick={() => setOpenTaskId(t.id)}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-black">{t.title}</h4>
        {t.hasUnreadForAdmin && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            New
          </span>
        )}
      </div>

      <span
        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(t.status)}`}
      >
        {t.status}
      </span>

      <p className="mt-3 text-sm text-gray-600">
        {t.description}
      </p>

      <div className="mt-4 border-t pt-3 text-xs text-gray-500 space-y-1">
        <p>To: {getAssigneeName(t.assignedToId)}</p>
        <p>{t.status === 'Completed' ? 'Completed' : `Due: ${t.dueDate}`}</p>
        <p className="flex items-center gap-1 text-indigo-600 font-medium pt-1">
          <MessageCircle size={12} /> View discussion
        </p>
      </div>
    </div>
  );
return (
  <DashboardLayout>
    {/* Header */}
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-black">
          Task Delegation Matrix
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Assign duties to employees, interns, or volunteers, and monitor task
          completion status.
        </p>
      </div>

      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 transition"
      >
        <Plus size={18} />
        Assign New Task
      </button>
    </div>

    {/* Task Board */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

      {/* Pending */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b-2 border-red-500 pb-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          <h3 className="font-bold text-black">
            Pending ({orgTasks.filter(t => t.status === "Pending").length})
          </h3>
        </div>

        {orgTasks.filter(t => t.status === "Pending").map(renderTaskCard)}
      </div>

      {/* Accepted */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b-2 border-yellow-500 pb-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
          <h3 className="font-bold text-black">
            Accepted ({orgTasks.filter(t => t.status === "Accepted").length})
          </h3>
        </div>

        {orgTasks.filter(t => t.status === "Accepted").map(renderTaskCard)}
      </div>

      {/* In Progress */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b-2 border-blue-500 pb-2">
          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          <h3 className="font-bold text-black">
            In Progress ({orgTasks.filter(t => t.status === "In Progress").length})
          </h3>
        </div>

        {orgTasks.filter(t => t.status === "In Progress").map(renderTaskCard)}
      </div>

      {/* Done */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b-2 border-green-500 pb-2">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          <h3 className="font-bold text-black">
            Done ({orgTasks.filter(t => t.status === "Completed").length})
          </h3>
        </div>

        {orgTasks.filter(t => t.status === "Completed").map(renderTaskCard)}
      </div>
    </div>

        {/* Create Task Modal */}
    {modalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-6 text-2xl font-bold text-black">
            Delegate Assignment Task
          </h2>

          <form onSubmit={handleSubmitTask} className="space-y-4">
            {/* Task Name */}
            <div>
              <label className="mb-2 block font-semibold text-black">
                Task Name / Duty
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Audit Medicine Stock"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="mb-2 block font-semibold text-black">
                Select Assignee
              </label>

              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              >
                <option value="">Choose Personnel</option>

                {orgStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-2 block font-semibold text-black">
                Priority Level
              </label>

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="mb-2 block font-semibold text-black">
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block font-semibold text-black">
                Detailed Task Description
              </label>

              <textarea
                rows={4}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Provide specific guidelines for task completion..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700"
              >
                Save & Assign Task
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {openTask && (
      <TaskThreadModal
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        getAssigneeName={getAssigneeName}
      />
    )}
  </DashboardLayout>
);
};

export default Tasks;
