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
  validateCreateGroup,
  validateUpdateGroup,
  validateAddGroupMember,
  validatePostMessage
} = require('../middleware/discussion');

const {
  getMyGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  getMessages,
  postMessage,
  markGroupRead
} = require('../controllers/discussionController');

router.use(requireAuth);

router.get(
  '/',
  getMyGroups
);

router.post(
  '/',
  requireRole('OrgAdmin'),
  requireOperational(),
  validateCreateGroup,
  createGroup
);

router.patch(
  '/:id',
  requireRole('OrgAdmin'),
  validateUpdateGroup,
  updateGroup
);

router.delete(
  '/:id',
  requireRole('OrgAdmin'),
  deleteGroup
);

router.get(
  '/:id/members',
  getGroupMembers
);

router.post(
  '/:id/members',
  requireRole('OrgAdmin'),
  validateAddGroupMember,
  addGroupMember
);

router.delete(
  '/:id/members/:userId',
  requireRole('OrgAdmin'),
  removeGroupMember
);

router.get(
  '/:id/messages',
  getMessages
);

router.post(
  '/:id/messages',
  validatePostMessage,
  postMessage
);

router.patch(
  '/:id/read',
  markGroupRead
);

module.exports = router;