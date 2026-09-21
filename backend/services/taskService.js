const supabase = require('../config/supabase');

const {
  serializeTask,
  serializeTaskComment
} = require('../utils/serializers');

const TASK_STATUSES = [
  'Pending',
  'Accepted',
  'In Progress',
  'Completed'
];

const canAccessTask = (user, task) => {
  if (task.org_id !== user.orgId) return false;
  if (user.role === 'OrgAdmin') return true;
  return task.assigned_to_id === user.id;
};

const fetchTaskOrThrow = async (id) => {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    const err = new Error('Could not load task.');
    err.statusCode = 500;
    throw err;
  }

  if (!task) {
    const err = new Error('Task not found.');
    err.statusCode = 404;
    throw err;
  }

  return task;
};

const getTasks = async ({
  user,
  orgId,
  projectId,
  campaignId
}) => {
  const scopedOrgId = user.role === 'SuperAdmin'
    ? orgId
    : user.orgId;

  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (scopedOrgId) {
    query = query.eq('org_id', scopedOrgId);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch tasks.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeTask);
};

const createTask = async ({
  user,
  title,
  description,
  assignedToId,
  priority,
  dueDate,
  projectId,
  campaignId
}) => {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      org_id: user.orgId,
      title,
      description,
      assigned_to_id: assignedToId,
      priority: priority || 'Medium',
      due_date: dueDate,
      status: 'Pending',
      project_id: projectId || null,
      campaign_id: campaignId || null
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not create task.');
    err.statusCode = 500;
    throw err;
  }

  const { data: assignee } = await supabase
    .from('users')
    .select('role')
    .eq('id', assignedToId)
    .maybeSingle();

  if (assignee) {
    await supabase.from('notifications').insert({
      org_id: user.orgId,
      title: 'New Task Assigned',
      message: `You have been assigned the task: "${title}". Deadline: ${dueDate || 'N/A'}. Priority: ${priority || 'Medium'}.`,
      type: 'TaskAlert',
      target_role: assignee.role,
      // Only the assignee should see this — not everyone with the same role.
      target_user_id: assignedToId
    });
  }

  return serializeTask(task);
};

const updateTaskStatus = async ({ id, status }) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id);

  if (error) {
    const err = new Error('Could not update task status.');
    err.statusCode = 500;
    throw err;
  }
};

const getTaskComments = async ({ user, id }) => {
  const task = await fetchTaskOrThrow(id);

  if (!canAccessTask(user, task)) {
    const err = new Error('Not authorized to view this task.');
    err.statusCode = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    const err = new Error('Could not fetch comments.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeTaskComment);
};

const addTaskComment = async ({
  user,
  id,
  message
}) => {
  const task = await fetchTaskOrThrow(id);

  if (!canAccessTask(user, task)) {
    const err = new Error('Not authorized to comment on this task.');
    err.statusCode = 403;
    throw err;
  }

  const { data: author } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const trimmedMessage = message.trim();

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: id,
      author_id: user.id,
      author_name: author?.full_name || user.email || 'Unknown',
      author_role: user.role,
      message: trimmedMessage
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not post comment.');
    err.statusCode = 500;
    throw err;
  }

  const isAssigneePosting =
    task.assigned_to_id === user.id;

  const unreadUpdate = isAssigneePosting
    ? {
        has_unread_for_admin: true,
        has_unread_for_assignee: false
      }
    : {
        has_unread_for_admin: false,
        has_unread_for_assignee: true
      };

  await supabase
    .from('tasks')
    .update(unreadUpdate)
    .eq('id', id);

  if (isAssigneePosting) {
    await supabase.from('notifications').insert({
      org_id: task.org_id,
      title: 'New Comment on Task',
      message: `${comment.author_name} left a comment on "${task.title}": "${trimmedMessage.slice(0, 120)}"`,
      type: 'GeneralAlert',
      target_role: 'OrgAdmin'
    });
  } else if (task.assigned_to_id) {
    const { data: assignee } = await supabase
      .from('users')
      .select('role')
      .eq('id', task.assigned_to_id)
      .maybeSingle();

    if (assignee) {
      await supabase.from('notifications').insert({
        org_id: task.org_id,
        title: 'New Reply on Task',
        message: `${comment.author_name} replied on "${task.title}": "${trimmedMessage.slice(0, 120)}"`,
        type: 'TaskAlert',
        target_role: assignee.role,
        target_user_id: task.assigned_to_id
      });
    }
  }

  return serializeTaskComment(comment);
};

const markTaskCommentsRead = async ({
  user,
  id
}) => {
  const task = await fetchTaskOrThrow(id);

  if (!canAccessTask(user, task)) {
    const err = new Error('Not authorized to view this task.');
    err.statusCode = 403;
    throw err;
  }

  const isAssignee =
    task.assigned_to_id === user.id;

  const update = isAssignee
    ? { has_unread_for_assignee: false }
    : { has_unread_for_admin: false };

  const { error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', id);

  if (error) {
    const err = new Error('Could not update read status.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  TASK_STATUSES,
  getTasks,
  createTask,
  updateTaskStatus,
  getTaskComments,
  addTaskComment,
  markTaskCommentsRead
};