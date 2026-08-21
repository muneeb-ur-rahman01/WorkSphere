const supabase = require('../config/supabase');
const { serializeTask, serializeTaskComment } = require('../utils/serializers');

// Can this user view/comment on this task?
// - OrgAdmin: any task within their own organization
// - Everyone else: only a task assigned directly to them
const canAccessTask = (req, task) => {
  if (task.org_id !== req.user.orgId) return false;
  if (req.user.role === 'OrgAdmin') return true;
  return task.assigned_to_id === req.user.id;
};

const fetchTaskOr404 = async (id, res) => {
  const { data: task, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
  if (error) {
    res.status(500).json({ success: false, error: 'Could not load task.' });
    return null;
  }
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found.' });
    return null;
  }
  return task;
};

// GET /api/tasks
const getTasks = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch tasks.' });
  return res.json({ success: true, tasks: data.map(serializeTask) });
};

// POST /api/tasks (OrgAdmin) body: { title, description, assignedToId, priority, dueDate }
// Also creates a notification for the assignee, mirroring the original app.
const createTask = async (req, res) => {
  const { title, description, assignedToId, priority, dueDate } = req.body;
  if (!title || !assignedToId) {
    return res.status(400).json({ success: false, error: 'Title and assignee are required.' });
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      org_id: req.user.orgId,
      title,
      description,
      assigned_to_id: assignedToId,
      priority: priority || 'Medium',
      due_date: dueDate,
      status: 'Pending'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create task.' });

  const { data: assignee } = await supabase.from('users').select('role').eq('id', assignedToId).maybeSingle();
  if (assignee) {
    await supabase.from('notifications').insert({
      org_id: req.user.orgId,
      title: 'New Task Assigned',
      message: `You have been assigned the task: "${title}". Deadline: ${dueDate || 'N/A'}. Priority: ${priority || 'Medium'}.`,
      type: 'GeneralAlert',
      target_role: assignee.role
    });
  }

  return res.json({ success: true, task: serializeTask(task) });
};

// PATCH /api/tasks/:id/status  body: { status }
const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Pending', 'Accepted', 'In Progress', 'Completed'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }

  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update task status.' });
  return res.json({ success: true });
};

// GET /api/tasks/:id/comments
const getTaskComments = async (req, res) => {
  const { id } = req.params;
  const task = await fetchTaskOr404(id, res);
  if (!task) return;

  if (!canAccessTask(req, task)) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this task.' });
  }

  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch comments.' });
  return res.json({ success: true, comments: data.map(serializeTaskComment) });
};

// POST /api/tasks/:id/comments  body: { message }
// Posts a comment/reply and flips the unread flag for whichever side didn't
// just post, so the other party sees a "new comment" indicator.
const addTaskComment = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Comment cannot be empty.' });
  }

  const task = await fetchTaskOr404(id, res);
  if (!task) return;

  if (!canAccessTask(req, task)) {
    return res.status(403).json({ success: false, error: 'Not authorized to comment on this task.' });
  }

  const { data: author } = await supabase.from('users').select('full_name').eq('id', req.user.id).maybeSingle();

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: id,
      author_id: req.user.id,
      author_name: author?.full_name || req.user.email || 'Unknown',
      author_role: req.user.role,
      message: message.trim()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not post comment.' });

  // Poster's own side is implicitly "read" (they just wrote it); flip the
  // unread flag for the other side of the conversation.
  const isAssigneePosting = task.assigned_to_id === req.user.id;
  const unreadUpdate = isAssigneePosting
    ? { has_unread_for_admin: true, has_unread_for_assignee: false }
    : { has_unread_for_admin: false, has_unread_for_assignee: true };

  await supabase.from('tasks').update(unreadUpdate).eq('id', id);

  // Nudge the other party with a standard notification, same pattern as task assignment.
  if (isAssigneePosting) {
    await supabase.from('notifications').insert({
      org_id: task.org_id,
      title: 'New Comment on Task',
      message: `${comment.author_name} left a comment on "${task.title}": "${message.trim().slice(0, 120)}"`,
      type: 'GeneralAlert',
      target_role: 'OrgAdmin'
    });
  } else if (task.assigned_to_id) {
    const { data: assignee } = await supabase.from('users').select('role').eq('id', task.assigned_to_id).maybeSingle();
    if (assignee) {
      await supabase.from('notifications').insert({
        org_id: task.org_id,
        title: 'New Reply on Task',
        message: `${comment.author_name} replied on "${task.title}": "${message.trim().slice(0, 120)}"`,
        type: 'GeneralAlert',
        target_role: assignee.role
      });
    }
  }

  return res.json({ success: true, comment: serializeTaskComment(comment) });
};

// PATCH /api/tasks/:id/comments/read
// Clears the unread flag for whichever side the requester belongs to.
const markTaskCommentsRead = async (req, res) => {
  const { id } = req.params;
  const task = await fetchTaskOr404(id, res);
  if (!task) return;

  if (!canAccessTask(req, task)) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this task.' });
  }

  const isAssignee = task.assigned_to_id === req.user.id;
  const update = isAssignee ? { has_unread_for_assignee: false } : { has_unread_for_admin: false };

  const { error } = await supabase.from('tasks').update(update).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update read status.' });
  return res.json({ success: true });
};

module.exports = {
  getTasks,
  createTask,
  updateTaskStatus,
  getTaskComments,
  addTaskComment,
  markTaskCommentsRead
};
