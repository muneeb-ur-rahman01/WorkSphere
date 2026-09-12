const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const { requireOperational } = require('../middleware/subscriptionAccess');

const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectTeam,
  addProjectTeamMember,
  removeProjectTeamMember,
  getMyProjectAssignments,
  updateProjectAssignmentStatus
} = require('../controllers/projectController');

router.use(requireAuth);

// ======================================================
// STAFF — MY PROJECT ASSIGNMENTS
// IMPORTANT: Must come before /:id
// ======================================================

router.get('/my/assignments', getMyProjectAssignments);

// ======================================================
// PROJECTS
// ======================================================

router.get('/', getProjects);

router.get('/:id', getProject);

// ======================================================
// CREATE / UPDATE / DELETE PROJECT
// ======================================================

// Also reachable by a staff member granted the
// 'projects' Accessibility permission, same as OrgAdmin.
router.post(
  '/',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  requireOperational(),
  createProject
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  requireOperational(),
  updateProject
);

// Deletion always allowed, even while suspended.
router.delete(
  '/:id',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  deleteProject
);

// ======================================================
// PROJECT TEAM
// ======================================================

router.get('/:id/team', getProjectTeam);

router.post(
  '/:id/team',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  requireOperational(),
  addProjectTeamMember
);

router.delete(
  '/:id/team/:userId',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  removeProjectTeamMember
);

// ======================================================
// STAFF PROJECT STATUS
// Pending → Accepted → In Progress → Completed
// ======================================================

router.patch(
  '/:id/assignment-status',
  updateProjectAssignmentStatus
);

module.exports = router;