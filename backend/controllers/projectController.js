const projectService = require('../services/projectService');

const createFromService = (serviceCall) => async (req, res) => {
  try {
    const result = await serviceCall(req);

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Something went wrong.'
    });
  }
};

const getProjects = createFromService(async (req) => {
  const projects = await projectService.getProjects({
    user: req.user,
    orgId: req.projectFilters?.orgId
  });

  return { projects };
});

const getProject = createFromService(async (req) => {
  const project = await projectService.getProject({
    user: req.user,
    id: req.params.id
  });

  return { project };
});

const createProject = createFromService(async (req) => {
  const project = await projectService.createProject({
    user: req.user,
    projectData: req.projectData
  });

  return { project };
});

const updateProject = createFromService(async (req) => {
  const project = await projectService.updateProject({
    user: req.user,
    id: req.params.id,
    projectData: req.projectData
  });

  return { project };
});

const deleteProject = createFromService(async (req) => {
  await projectService.deleteProject({
    user: req.user,
    id: req.params.id
  });

  return {};
});

const getMyProjectAssignments = createFromService(async (req) => {
  const projects = await projectService.getMyProjectAssignments({
    user: req.user
  });

  return { projects };
});

const getProjectTeam = createFromService(async (req) => {
  const members = await projectService.getProjectTeam({
    id: req.params.id
  });

  return { members };
});

const addProjectTeamMember = createFromService(async (req) => {
  const member = await projectService.addProjectTeamMember({
    user: req.user,
    id: req.params.id,
    userId: req.teamMemberData.userId,
    roleOnEntity: req.teamMemberData.roleOnEntity
  });

  return { member };
});

const updateProjectAssignmentStatus = createFromService(async (req) => {
  const assignment = await projectService.updateProjectAssignmentStatus({
    user: req.user,
    id: req.params.id,
    status: req.assignmentStatus
  });

  return { assignment };
});

const removeProjectTeamMember = createFromService(async (req) => {
  await projectService.removeProjectTeamMember({
    user: req.user,
    id: req.params.id,
    userId: req.params.userId
  });

  return {};
});

module.exports = {
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
};