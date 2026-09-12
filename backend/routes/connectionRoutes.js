const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getConnections, createConnectionRequest, respondToConnection, withdrawConnection,
  getMessages, sendMessage
} = require('../controllers/connectionController');

router.use(requireAuth, requireRole('OrgAdmin'));
router.get('/', getConnections);
router.post('/', createConnectionRequest);
router.patch('/:id/status', respondToConnection);
router.delete('/:id', withdrawConnection);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

module.exports = router;
