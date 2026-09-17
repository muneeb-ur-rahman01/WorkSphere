const supabase = require('../config/supabase');

const {
  serializeProject,
  serializeTeamMember
} = require('../utils/serializers');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const STATUSES = [
  'Planning',
  'Active',
  'OnHold',
  'Completed',
  'Cancelled'
];

const getProjects = async ({ user, orgId: requestedOrgId }) => {
  const orgId = user.role === 'SuperAdmin'
    ? requestedOrgId
    : user.orgId;

  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch projects.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeProject);
};

const getProject = async ({ user, id }) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    const err = new Error('Project not found.');
    err.statusCode = 404;
    throw err;
  }

  if (user.role !== 'SuperAdmin' && data.org_id !== user.orgId) {
    const err = new Error('Not authorized to view this project.');
    err.statusCode = 403;
    throw err;
  }

  return serializeProject(data);
};

const createProject = async ({ user, projectData }) => {
  const {
    title,
    description,
    objectives,
    location,
    startDate,
    endDate,
    budget,
    status
  } = projectData;

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      org_id: user.orgId,
      title,
      description,
      objectives,
      location,
      start_date: startDate || null,
      end_date: endDate || null,
      budget: budget || null,
      status: status || 'Planning',
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not create project.');
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.PROJECT_CREATED,
    entityType: 'project',
    entityId: project.id,
    entityLabel: project.title
  });

  return serializeProject(project);
};

const updateProject = async ({ user, id, projectData }) => {
  const {
    title,
    description,
    objectives,
    location,
    startDate,
    endDate,
    budget,
    status
  } = projectData;

  const updates = {};

  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (objectives !== undefined) updates.objectives = objectives;
  if (location !== undefined) updates.location = location;
  if (startDate !== undefined) updates.start_date = startDate || null;
  if (endDate !== undefined) updates.end_date = endDate || null;
  if (budget !== undefined) updates.budget = budget || null;
  if (status !== undefined) updates.status = status;

  const { data: project, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update project.');
    err.statusCode = 500;
    throw err;
  }

  return serializeProject(project);
};

const deleteProject = async ({ user, id }) => {
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', id)
    .eq('org_id', user.orgId)
    .maybeSingle();

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete project.');
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.PROJECT_DELETED,
    entityType: 'project',
    entityId: id,
    entityLabel: project?.title || null
  });
};

const getMyProjectAssignments = async ({ user }) => {
  const userId = user.id;
  const orgId = user.orgId;

  const { data: assignments, error } = await supabase
    .from('entity_team_members')
    .select(`
      id,
      entity_id,
      user_id,
      role_on_entity,
      project_status,
      accepted_at,
      started_at,
      completed_at,
      added_at
    `)
    .eq('entity_type', 'project')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .order('added_at', { ascending: false });

  if (error) {
    const err = new Error('Could not fetch your project assignments.');
    err.statusCode = 500;
    throw err;
  }

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const projectIds = assignments.map((assignment) => assignment.entity_id);

  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .eq('org_id', orgId);

  if (projectError) {
    const err = new Error('Could not fetch assigned projects.');
    err.statusCode = 500;
    throw err;
  }

  const assignmentMap = Object.fromEntries(
    assignments.map((assignment) => [
      assignment.entity_id,
      assignment
    ])
  );

  return projects.map((project) => ({
    ...serializeProject(project),
    assignment: serializeTeamMember(
      assignmentMap[project.id]
    )
  }));
};

const getProjectTeam = async ({ id }) => {
  const { data, error } = await supabase
    .from('entity_team_members')
    .select('*')
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .order('added_at', { ascending: true });

  if (error) {
    const err = new Error('Could not fetch project team.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeTeamMember);
};

const addProjectTeamMember = async ({
  user,
  id,
  userId,
  roleOnEntity
}) => {
  const { data: target } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle();

  if (!target || target.org_id !== user.orgId) {
    const err = new Error(
      'That user is not part of your organization.'
    );
    err.statusCode = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('entity_team_members')
    .upsert(
      {
        org_id: user.orgId,
        entity_type: 'project',
        entity_id: id,
        user_id: userId,
        role_on_entity: roleOnEntity || null,
        added_by: user.id
      },
      {
        onConflict: 'entity_type,entity_id,user_id'
      }
    )
    .select()
    .single();

  if (error) {
    const err = new Error('Could not add team member.');
    err.statusCode = 500;
    throw err;
  }

  return serializeTeamMember(data);
};

const updateProjectAssignmentStatus = async ({
  user,
  id,
  status
}) => {
  const { data: assignment, error: findError } = await supabase
    .from('entity_team_members')
    .select('*')
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .eq('user_id', user.id)
    .eq('org_id', user.orgId)
    .maybeSingle();

  if (findError || !assignment) {
    const err = new Error('Project assignment not found.');
    err.statusCode = 404;
    throw err;
  }

  const updates = {
    project_status: status
  };

  if (status === 'Accepted' && !assignment.accepted_at) {
    updates.accepted_at = new Date().toISOString();
  }

  if (status === 'In Progress' && !assignment.started_at) {
    updates.started_at = new Date().toISOString();
  }

  if (status === 'Completed' && !assignment.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('entity_team_members')
    .update(updates)
    .eq('id', assignment.id)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update project assignment.');
    err.statusCode = 500;
    throw err;
  }

  return serializeTeamMember(data);
};

const removeProjectTeamMember = async ({
  user,
  id,
  userId
}) => {
  const { error } = await supabase
    .from('entity_team_members')
    .delete()
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .eq('user_id', userId)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not remove team member.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  STATUSES,
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