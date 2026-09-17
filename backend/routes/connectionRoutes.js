const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateCreateConnection,
  validateConnectionResponse,
  validateSendMessage
} = require('../middleware/connection');

const {
  getConnections,
  createConnectionRequest,
  respondToConnection,
  withdrawConnection,
  getMessages,
  sendMessage
} = require('../controllers/connectionController');

router.use(
  requireAuth,
  requireRole('OrgAdmin')
);

router.get(
  '/',
  getConnections
);

router.post(
  '/',
  validateCreateConnection,
  createConnectionRequest
);

router.patch(
  '/:id/status',
  validateConnectionResponse,
  respondToConnection
);

router.delete(
  '/:id',
  withdrawConnection
);

router.get(
  '/:id/messages',
  getMessages
);

router.post(
  '/:id/messages',
  validateSendMessage,
  sendMessage
);

module.exports = router;