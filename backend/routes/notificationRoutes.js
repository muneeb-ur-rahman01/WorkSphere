const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateCustomAlert
} = require('../middleware/notification');

const {
  getNotifications,
  sendCustomAlert,
  markRead,
  markAllRead
} = require('../controllers/notificationController');

router.use(requireAuth);

// Read receipts (any authenticated user; scoped to what they may see)
router.post('/read-all', markAllRead);
router.post('/:id/read', (req, res, next) => (/^[0-9a-f-]{36}$/i.test(req.params.id) ? next() : res.status(400).json({ success: false, error: 'Invalid id.' })), markRead);

router.get(
  '/',
  getNotifications
);

router.post(
  '/',
  requireRole('OrgAdmin'),
  validateCustomAlert,
  sendCustomAlert
);

module.exports = router;