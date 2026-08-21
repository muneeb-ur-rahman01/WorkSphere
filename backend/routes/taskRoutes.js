const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const {
  getTasks, createTask, updateTaskStatus,
  getTaskComments, addTaskComment, markTaskCommentsRead
} = require('../controllers/taskController');

router.use(requireAuth);
router.get('/', getTasks);
router.post('/', requireRole('OrgAdmin'), requireOperational(), createTask);
router.patch('/:id/status', updateTaskStatus);

// Comments / discussion thread (authorization for who may read/post is
// enforced inside the controller - assignee or any OrgAdmin in the org)
router.get('/:id/comments', getTaskComments);
router.post('/:id/comments', addTaskComment);
router.patch('/:id/comments/read', markTaskCommentsRead);

module.exports = router;
