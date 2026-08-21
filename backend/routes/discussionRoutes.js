const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const {
  getMyGroups, createGroup, updateGroup, deleteGroup,
  getGroupMembers, addGroupMember, removeGroupMember,
  getMessages, postMessage, markGroupRead
} = require('../controllers/discussionController');

router.use(requireAuth);

router.get('/', getMyGroups);
router.post('/', requireRole('OrgAdmin'), requireOperational(), createGroup); // OrgAdmin adds departments as needed
router.patch('/:id', requireRole('OrgAdmin'), updateGroup); // OrgAdmin renames/edits description
router.delete('/:id', requireRole('OrgAdmin'), deleteGroup); // OrgAdmin deletes a department

router.get('/:id/members', getGroupMembers);
router.post('/:id/members', requireRole('OrgAdmin'), addGroupMember);
router.delete('/:id/members/:userId', requireRole('OrgAdmin'), removeGroupMember);

router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);
router.patch('/:id/read', markGroupRead);

module.exports = router;
