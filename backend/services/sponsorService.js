const supabase = require('../config/supabase');

const {
  serializeSponsor,
  serializeSponsorship
} = require('../utils/serializers');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const STATUSES = ['Proposed', 'Active', 'Completed', 'Cancelled'];

// ============================================================
// Sponsors
// ============================================================

const getSponsors = async ({ user, orgId }) => {
  const scopedOrgId = user.role === 'SuperAdmin'
    ? orgId
    : user.orgId;

  let query = supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: false });

  if (scopedOrgId) {
    query = query.eq('org_id', scopedOrgId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch sponsors.');
    err.statusCode = 500;
    throw err;
  }

  if (data.length === 0) {
    return [];
  }

  const { data: sponsorships } = await supabase
    .from('sponsorships')
    .select('sponsor_id, amount')
    .in('sponsor_id', data.map((s) => s.id));

  const totalBySponsor = {};

  (sponsorships || []).forEach((s) => {
    totalBySponsor[s.sponsor_id] =
      (totalBySponsor[s.sponsor_id] || 0) + Number(s.amount || 0);
  });

  return data.map((s) => ({
    ...serializeSponsor(s),
    totalCommitted: totalBySponsor[s.id] || 0
  }));
};

const createSponsor = async ({
  user,
  name,
  contactName,
  email,
  phone,
  notes
}) => {
  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .insert({
      org_id: user.orgId,
      name,
      contact_name: contactName,
      email,
      phone,
      notes
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not create sponsor.');
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.SPONSOR_CREATED,
    entityType: 'sponsor',
    entityId: sponsor.id,
    entityLabel: sponsor.name
  });

  return serializeSponsor(sponsor);
};

const updateSponsor = async ({
  user,
  id,
  name,
  contactName,
  email,
  phone,
  notes
}) => {
  const updates = {};

  if (name !== undefined) updates.name = name;
  if (contactName !== undefined) updates.contact_name = contactName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (notes !== undefined) updates.notes = notes;

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update sponsor.');
    err.statusCode = 500;
    throw err;
  }

  return serializeSponsor(sponsor);
};

const deleteSponsor = async ({ user, id }) => {
  const { error } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete sponsor.');
    err.statusCode = 500;
    throw err;
  }
};

// ============================================================
// Sponsorships
// ============================================================

const getSponsorships = async ({
  user,
  orgId,
  sponsorId,
  projectId,
  campaignId
}) => {
  const scopedOrgId = user.role === 'SuperAdmin'
    ? orgId
    : user.orgId;

  let query = supabase
    .from('sponsorships')
    .select('*')
    .order('created_at', { ascending: false });

  if (scopedOrgId) {
    query = query.eq('org_id', scopedOrgId);
  }

  if (sponsorId) {
    query = query.eq('sponsor_id', sponsorId);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch sponsorships.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeSponsorship);
};

const createSponsorship = async ({
  user,
  sponsorId,
  projectId,
  campaignId,
  packageName,
  amount,
  status,
  startDate,
  endDate,
  notes
}) => {
  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('name')
    .eq('id', sponsorId)
    .eq('org_id', user.orgId)
    .maybeSingle();

  if (!sponsor) {
    const err = new Error('Sponsor not found.');
    err.statusCode = 404;
    throw err;
  }

  const { data: sponsorship, error } = await supabase
    .from('sponsorships')
    .insert({
      org_id: user.orgId,
      sponsor_id: sponsorId,
      project_id: projectId || null,
      campaign_id: campaignId || null,
      package_name: packageName,
      amount: amount || null,
      status: status || 'Proposed',
      start_date: startDate || null,
      end_date: endDate || null,
      notes
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not record sponsorship.');
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.SPONSORSHIP_RECORDED,
    entityType: 'sponsorship',
    entityId: sponsorship.id,
    entityLabel: `${sponsor.name}${packageName ? ` — ${packageName}` : ''}`
  });

  return serializeSponsorship(sponsorship);
};

const updateSponsorship = async ({
  user,
  id,
  packageName,
  amount,
  status,
  startDate,
  endDate,
  notes
}) => {
  const updates = {};

  if (packageName !== undefined) {
    updates.package_name = packageName;
  }

  if (amount !== undefined) {
    updates.amount = amount || null;
  }

  if (status !== undefined) {
    updates.status = status;
  }

  if (startDate !== undefined) {
    updates.start_date = startDate || null;
  }

  if (endDate !== undefined) {
    updates.end_date = endDate || null;
  }

  if (notes !== undefined) {
    updates.notes = notes;
  }

  const { data: sponsorship, error } = await supabase
    .from('sponsorships')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update sponsorship.');
    err.statusCode = 500;
    throw err;
  }

  return serializeSponsorship(sponsorship);
};

const deleteSponsorship = async ({ user, id }) => {
  const { error } = await supabase
    .from('sponsorships')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete sponsorship.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  STATUSES,
  getSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getSponsorships,
  createSponsorship,
  updateSponsorship,
  deleteSponsorship
};