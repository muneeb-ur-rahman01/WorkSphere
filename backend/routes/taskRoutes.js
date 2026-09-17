const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  requireOperational
} = require('../middleware/subscriptionAccess');

const {
  validateTaskQuery,
  validateCreateTask,
  validateTaskStatus,
  validateTaskComment
} = require('../middleware/task');

const {
  getTasks,
  createTask,
  updateTaskStatus,
  getTaskComments,
  addTaskComment,
  markTaskCommentsRead
} = require('../controllers/taskController');

router.use(requireAuth);

router.get('/', validateTaskQuery, getTasks);

router.post(
  '/',
  requireRole('OrgAdmin'),
  requireOperational(),
  validateCreateTask,
  createTask
);

router.patch(
  '/:id/status',
  validateTaskStatus,
  updateTaskStatus
);

router.get(
  '/:id/comments',
  getTaskComments
);

router.post(
  '/:id/comments',
  validateTaskComment,
  addTaskComment
);

router.patch(
  '/:id/comments/read',
  markTaskCommentsRead
);

module.exports = router;