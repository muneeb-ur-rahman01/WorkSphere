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
  sendCustomAlert
} = require('../controllers/notificationController');

router.use(requireAuth);

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