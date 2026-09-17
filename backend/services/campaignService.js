const supabase = require('../config/supabase');

const {
  serializeCampaign,
  serializeTeamMember
} = require('../utils/serializers');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const STATUSES = [
  'Planning',
  'Active',
  'Completed',
  'Cancelled'
];

const TYPES = [
  'Fundraising',
  'Awareness',
  'Outreach',
  'Other'
];

// ============================================================
// Campaigns
// ============================================================

const getCampaigns = async ({
  user,
  orgId
}) => {
  const targetOrgId =
    user.role === 'SuperAdmin'
      ? orgId
      : user.orgId;

  let query = supabase
    .from('campaigns')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (targetOrgId) {
    query = query.eq(
      'org_id',
      targetOrgId
    );
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    console.error(
      '[campaignService] Get campaigns failed:',
      error.message
    );

    throw new Error(
      'Could not fetch campaigns.'
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  const {
    data: donations
  } = await supabase
    .from('donations')
    .select(
      'campaign_id, amount'
    )
    .in(
      'campaign_id',
      data.map(
        (campaign) => campaign.id
      )
    );

  const raisedByCampaign = {};

  (donations || []).forEach(
    (donation) => {
      raisedByCampaign[
        donation.campaign_id
      ] =
        (
          raisedByCampaign[
            donation.campaign_id
          ] || 0
        ) +
        Number(donation.amount);
    }
  );

  return data.map(
    (campaign) => ({
      ...serializeCampaign(
        campaign
      ),
      raisedAmount:
        raisedByCampaign[
          campaign.id
        ] || 0
    })
  );
};

const getCampaign = async ({
  user,
  id
}) => {
  const {
    data,
    error
  } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    const notFoundError =
      new Error(
        'Campaign not found.'
      );

    notFoundError.statusCode = 404;

    throw notFoundError;
  }

  if (
    user.role !== 'SuperAdmin' &&
    data.org_id !== user.orgId
  ) {
    const forbiddenError =
      new Error(
        'Not authorized to view this campaign.'
      );

    forbiddenError.statusCode = 403;

    throw forbiddenError;
  }

  return serializeCampaign(data);
};

const createCampaign = async ({
  user,
  title,
  description,
  objective,
  campaignType,
  startDate,
  endDate,
  goalAmount,
  status
}) => {
  const {
    data: campaign,
    error
  } = await supabase
    .from('campaigns')
    .insert({
      org_id: user.orgId,
      title,
      description,
      objective,
      campaign_type:
        campaignType ||
        'Fundraising',
      start_date:
        startDate || null,
      end_date:
        endDate || null,
      goal_amount:
        goalAmount || null,
      status:
        status || 'Planning',
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error(
      '[campaignService] Create campaign failed:',
      error.message
    );

    throw new Error(
      'Could not create campaign.'
    );
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action:
      AUDIT_ACTIONS.CAMPAIGN_CREATED,
    entityType: 'campaign',
    entityId: campaign.id,
    entityLabel: campaign.title
  });

  return serializeCampaign(
    campaign
  );
};

const updateCampaign = async ({
  user,
  id,
  title,
  description,
  objective,
  campaignType,
  startDate,
  endDate,
  goalAmount,
  status
}) => {
  const updates = {};

  if (title !== undefined) {
    updates.title = title;
  }

  if (description !== undefined) {
    updates.description =
      description;
  }

  if (objective !== undefined) {
    updates.objective = objective;
  }

  if (campaignType !== undefined) {
    updates.campaign_type =
      campaignType;
  }

  if (startDate !== undefined) {
    updates.start_date =
      startDate || null;
  }

  if (endDate !== undefined) {
    updates.end_date =
      endDate || null;
  }

  if (goalAmount !== undefined) {
    updates.goal_amount =
      goalAmount || null;
  }

  if (status !== undefined) {
    updates.status = status;
  }

  const {
    data: campaign,
    error
  } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    console.error(
      '[campaignService] Update campaign failed:',
      error.message
    );

    throw new Error(
      'Could not update campaign.'
    );
  }

  return serializeCampaign(
    campaign
  );
};

const deleteCampaign = async ({
  user,
  id
}) => {
  const {
    data: campaign
  } = await supabase
    .from('campaigns')
    .select('title')
    .eq('id', id)
    .eq('org_id', user.orgId)
    .maybeSingle();

  const {
    error
  } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    console.error(
      '[campaignService] Delete campaign failed:',
      error.message
    );

    throw new Error(
      'Could not delete campaign.'
    );
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action:
      AUDIT_ACTIONS.CAMPAIGN_DELETED,
    entityType: 'campaign',
    entityId: id,
    entityLabel:
      campaign?.title || null
  });
};

// ============================================================
// Campaign Team
// ============================================================

const getCampaignTeam = async ({
  id
}) => {
  const {
    data,
    error
  } = await supabase
    .from('entity_team_members')
    .select('*')
    .eq(
      'entity_type',
      'campaign'
    )
    .eq(
      'entity_id',
      id
    )
    .order('added_at', {
      ascending: true
    });

  if (error) {
    console.error(
      '[campaignService] Get campaign team failed:',
      error.message
    );

    throw new Error(
      'Could not fetch campaign team.'
    );
  }

  return (data || []).map(
    serializeTeamMember
  );
};

const addCampaignTeamMember = async ({
  user,
  campaignId,
  userId,
  roleOnEntity
}) => {
  const {
    data: target
  } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle();

  if (
    !target ||
    target.org_id !== user.orgId
  ) {
    const error =
      new Error(
        'That user is not part of your organization.'
      );

    error.statusCode = 403;

    throw error;
  }

  const {
    data,
    error
  } = await supabase
    .from('entity_team_members')
    .upsert(
      {
        org_id: user.orgId,
        entity_type: 'campaign',
        entity_id: campaignId,
        user_id: userId,
        role_on_entity:
          roleOnEntity || null,
        added_by: user.id
      },
      {
        onConflict:
          'entity_type,entity_id,user_id'
      }
    )
    .select()
    .single();

  if (error) {
    console.error(
      '[campaignService] Add campaign team member failed:',
      error.message
    );

    throw new Error(
      'Could not add team member.'
    );
  }

  return serializeTeamMember(
    data
  );
};

const removeCampaignTeamMember = async ({
  user,
  campaignId,
  userId
}) => {
  const {
    error
  } = await supabase
    .from('entity_team_members')
    .delete()
    .eq(
      'entity_type',
      'campaign'
    )
    .eq(
      'entity_id',
      campaignId
    )
    .eq(
      'user_id',
      userId
    )
    .eq(
      'org_id',
      user.orgId
    );

  if (error) {
    console.error(
      '[campaignService] Remove campaign team member failed:',
      error.message
    );

    throw new Error(
      'Could not remove team member.'
    );
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignTeam,
  addCampaignTeamMember,
  removeCampaignTeamMember,
  STATUSES,
  TYPES
};