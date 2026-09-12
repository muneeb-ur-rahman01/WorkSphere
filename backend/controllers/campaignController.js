const supabase = require('../config/supabase');
const { serializeCampaign, serializeTeamMember } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

const STATUSES = ['Planning', 'Active', 'Completed', 'Cancelled'];
const TYPES = ['Fundraising', 'Awareness', 'Outreach', 'Other'];

// GET /api/campaigns — SuperAdmin sees all (optionally ?orgId=), everyone else scoped to their own org
// Includes a computed `raisedAmount` per campaign (sum of linked donations)
// so the list view can show progress against goalAmount without a second round trip.
const getCampaigns = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch campaigns.' });
  if (data.length === 0) return res.json({ success: true, campaigns: [] });

  const { data: donations } = await supabase
    .from('donations')
    .select('campaign_id, amount')
    .in('campaign_id', data.map((c) => c.id));

  const raisedByCampaign = {};
  (donations || []).forEach((d) => {
    raisedByCampaign[d.campaign_id] = (raisedByCampaign[d.campaign_id] || 0) + Number(d.amount);
  });

  return res.json({
    success: true,
    campaigns: data.map((c) => ({ ...serializeCampaign(c), raisedAmount: raisedByCampaign[c.id] || 0 }))
  });
};

// GET /api/campaigns/:id
const getCampaign = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (error || !data) return res.status(404).json({ success: false, error: 'Campaign not found.' });
  if (req.user.role !== 'SuperAdmin' && data.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized to view this campaign.' });
  }
  return res.json({ success: true, campaign: serializeCampaign(data) });
};

// POST /api/campaigns (OrgAdmin)
const createCampaign = async (req, res) => {
  const { title, description, objective, campaignType, startDate, endDate, goalAmount, status } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });
  if (campaignType && !TYPES.includes(campaignType)) return res.status(400).json({ success: false, error: 'Invalid campaign type.' });

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: req.user.orgId,
      title,
      description,
      objective,
      campaign_type: campaignType || 'Fundraising',
      start_date: startDate || null,
      end_date: endDate || null,
      goal_amount: goalAmount || null,
      status: status || 'Planning',
      created_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create campaign.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
    entityType: 'campaign',
    entityId: campaign.id,
    entityLabel: campaign.title
  });

  return res.json({ success: true, campaign: serializeCampaign(campaign) });
};

// PATCH /api/campaigns/:id (OrgAdmin, own org)
const updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { title, description, objective, campaignType, startDate, endDate, goalAmount, status } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });
  if (campaignType && !TYPES.includes(campaignType)) return res.status(400).json({ success: false, error: 'Invalid campaign type.' });

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (objective !== undefined) updates.objective = objective;
  if (campaignType !== undefined) updates.campaign_type = campaignType;
  if (startDate !== undefined) updates.start_date = startDate || null;
  if (endDate !== undefined) updates.end_date = endDate || null;
  if (goalAmount !== undefined) updates.goal_amount = goalAmount || null;
  if (status !== undefined) updates.status = status;

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update campaign.' });
  return res.json({ success: true, campaign: serializeCampaign(campaign) });
};

// DELETE /api/campaigns/:id (OrgAdmin, own org)
const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  const { data: campaign } = await supabase.from('campaigns').select('title').eq('id', id).eq('org_id', req.user.orgId).maybeSingle();

  const { error } = await supabase.from('campaigns').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete campaign.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: AUDIT_ACTIONS.CAMPAIGN_DELETED,
    entityType: 'campaign',
    entityId: id,
    entityLabel: campaign?.title || null
  });

  return res.json({ success: true });
};

// ============================================================
// Campaign Team (shared entity_team_members table — see schema.sql)
// ============================================================

const getCampaignTeam = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('entity_team_members')
    .select('*')
    .eq('entity_type', 'campaign')
    .eq('entity_id', id)
    .order('added_at', { ascending: true });
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch campaign team.' });
  return res.json({ success: true, members: data.map(serializeTeamMember) });
};

const addCampaignTeamMember = async (req, res) => {
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
      { org_id: req.user.orgId, entity_type: 'campaign', entity_id: id, user_id: userId, role_on_entity: roleOnEntity || null, added_by: req.user.id },
      { onConflict: 'entity_type,entity_id,user_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not add team member.' });
  return res.json({ success: true, member: serializeTeamMember(data) });
};

const removeCampaignTeamMember = async (req, res) => {
  const { id, userId } = req.params;
  const { error } = await supabase
    .from('entity_team_members')
    .delete()
    .eq('entity_type', 'campaign')
    .eq('entity_id', id)
    .eq('user_id', userId)
    .eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not remove team member.' });
  return res.json({ success: true });
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignTeam,
  addCampaignTeamMember,
  removeCampaignTeamMember
};
