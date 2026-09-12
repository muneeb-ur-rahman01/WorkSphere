const supabase = require('../config/supabase');
const { serializeProject, serializeTeamMember } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];

// GET /api/projects — SuperAdmin sees all (optionally ?orgId=), everyone else scoped to their own org
const getProjects = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch projects.' });
  return res.json({ success: true, projects: data.map(serializeProject) });
};

// GET /api/projects/:id
const getProject = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error || !data) return res.status(404).json({ success: false, error: 'Project not found.' });
  if (req.user.role !== 'SuperAdmin' && data.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this project.' });
  }
  return res.json({ success: true, project: serializeProject(data) });
};

// POST /api/projects (OrgAdmin)
const createProject = async (req, res) => {
  const { title, description, objectives, location, startDate, endDate, budget, status } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      org_id: req.user.orgId,
      title,
      description,
      objectives,
      location,
      start_date: startDate || null,
      end_date: endDate || null,
      budget: budget || null,
      status: status || 'Planning',
      created_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create project.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: AUDIT_ACTIONS.PROJECT_CREATED,
    entityType: 'project',
    entityId: project.id,
    entityLabel: project.title
  });

  return res.json({ success: true, project: serializeProject(project) });
};

// PATCH /api/projects/:id (OrgAdmin, own org)
const updateProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, objectives, location, startDate, endDate, budget, status } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });

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
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update project.' });
  return res.json({ success: true, project: serializeProject(project) });
};

// DELETE /api/projects/:id (OrgAdmin, own org)
const deleteProject = async (req, res) => {
  const { id } = req.params;
  const { data: project } = await supabase.from('projects').select('title').eq('id', id).eq('org_id', req.user.orgId).maybeSingle();

  const { error } = await supabase.from('projects').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete project.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: AUDIT_ACTIONS.PROJECT_DELETED,
    entityType: 'project',
    entityId: id,
    entityLabel: project?.title || null
  });

  return res.json({ success: true });
};
// GET /api/projects/my/assignments
// Returns projects where current user is a team member

const getMyProjectAssignments = async (req, res) => {
  const userId = req.user.id;
  const orgId = req.user.orgId;

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
    return res.status(500).json({
      success: false,
      error: 'Could not fetch your project assignments.'
    });
  }

  if (!assignments || assignments.length === 0) {
    return res.json({
      success: true,
      projects: []
    });
  }

  const projectIds = assignments.map((a) => a.entity_id);

  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .eq('org_id', orgId);

  if (projectError) {
    return res.status(500).json({
      success: false,
      error: 'Could not fetch assigned projects.'
    });
  }

  const assignmentMap = Object.fromEntries(
    assignments.map((a) => [a.entity_id, a])
  );

  const result = projects.map((project) => ({
    ...serializeProject(project),
    assignment: serializeTeamMember(assignmentMap[project.id])
  }));

  return res.json({
    success: true,
    projects: result
  });
};
// ============================================================
// Project Team (shared entity_team_members table — see schema.sql)
// ============================================================

// GET /api/projects/:id/team
const getProjectTeam = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('entity_team_members')
    .select('*')
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .order('added_at', { ascending: true });
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch project team.' });
  return res.json({ success: true, members: data.map(serializeTeamMember) });
};

// POST /api/projects/:id/team (OrgAdmin)  body: { userId, roleOnEntity }
const addProjectTeamMember = async (req, res) => {
  const { id } = req.params;
  const { userId, roleOnEntity } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId is required.' });

  const { data: target } = await supabase.from('users').select('org_id').eq('id', userId).maybeSingle();
  if (!target || target.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'That user is not part of your organization.' });
  }

  const { data, error } = await supabase
    .from('entity_team_members')
    .upsert(
      { org_id: req.user.orgId, entity_type: 'project', entity_id: id, user_id: userId, role_on_entity: roleOnEntity || null, added_by: req.user.id },
      { onConflict: 'entity_type,entity_id,user_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not add team member.' });
  return res.json({ success: true, member: serializeTeamMember(data) });
};
const updateProjectAssignmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    'Accepted',
    'In Progress',
    'Completed'
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project assignment status.'
    });
  }

  const { data: assignment, error: findError } = await supabase
    .from('entity_team_members')
    .select('*')
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .eq('user_id', req.user.id)
    .eq('org_id', req.user.orgId)
    .maybeSingle();

  if (findError || !assignment) {
    return res.status(404).json({
      success: false,
      error: 'Project assignment not found.'
    });
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
    return res.status(500).json({
      success: false,
      error: 'Could not update project assignment.'
    });
  }

  return res.json({
    success: true,
    assignment: serializeTeamMember(data)
  });
};
// DELETE /api/projects/:id/team/:userId (OrgAdmin)
const removeProjectTeamMember = async (req, res) => {
  const { id, userId } = req.params;
  const { error } = await supabase
    .from('entity_team_members')
    .delete()
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .eq('user_id', userId)
    .eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not remove team member.' });
  return res.json({ success: true });
};

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