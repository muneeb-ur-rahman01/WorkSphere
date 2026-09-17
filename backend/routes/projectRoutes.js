const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const {
  requireOperational
} = require('../middleware/subscriptionAccess');

const {
  validateProjectQuery,
  validateCreateProject,
  validateUpdateProject,
  validateProjectTeamMember,
  validateProjectAssignmentStatus
} = require('../middleware/project');

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

// STAFF — MY PROJECT ASSIGNMENTS
// Must remain before /:id.
router.get(
  '/my/assignments',
  getMyProjectAssignments
);

// PROJECTS
router.get(
  '/',
  validateProjectQuery,
  getProjects
);

router.get(
  '/:id',
  getProject
);

// CREATE / UPDATE / DELETE PROJECT
router.post(
  '/',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  requireOperational(),
  validateCreateProject,
  createProject
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  requireOperational(),
  validateUpdateProject,
  updateProject
);

// Deletion remains allowed even while suspended.
router.delete(
  '/:id',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  deleteProject
);

// PROJECT TEAM
router.get(
  '/:id/team',
  getProjectTeam
);

router.post(
  '/:id/team',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  requireOperational(),
  validateProjectTeamMember,
  addProjectTeamMember
);

router.delete(
  '/:id/team/:userId',
  requireRoleOrSectionPermission('projects', 'OrgAdmin'),
  removeProjectTeamMember
);

// STAFF PROJECT STATUS
// Pending → Accepted → In Progress → Completed
router.patch(
  '/:id/assignment-status',
  validateProjectAssignmentStatus,
  updateProjectAssignmentStatus
);

module.exports = router;