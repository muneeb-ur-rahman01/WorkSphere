const taskService = require('../services/taskService');

const getTasks = async (req, res) => {
  try {
    const tasks = await taskService.getTasks({
      user: req.user,
      ...req.taskFilters
    });

    return res.json({
      success: true,
      tasks
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch tasks.'
    });
  }
};

const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask({
      user: req.user,
      ...req.taskData
    });

    return res.json({
      success: true,
      task
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create task.'
    });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    await taskService.updateTaskStatus({
      id: req.params.id,
      status: req.taskStatus
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update task status.'
    });
  }
};

const getTaskComments = async (req, res) => {
  try {
    const comments = await taskService.getTaskComments({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true,
      comments
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch comments.'
    });
  }
};

const addTaskComment = async (req, res) => {
  try {
    const comment = await taskService.addTaskComment({
      user: req.user,
      id: req.params.id,
      ...req.taskCommentData
    });

    return res.json({
      success: true,
      comment
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not post comment.'
    });
  }
};

const markTaskCommentsRead = async (req, res) => {
  try {
    await taskService.markTaskCommentsRead({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update read status.'
    });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTaskStatus,
  getTaskComments,
  addTaskComment,
  markTaskCommentsRead
};