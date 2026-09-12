const supabase = require('../config/supabase');
const { serializeSponsor, serializeSponsorship } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// ============================================================
// Sponsors
// ============================================================

const getSponsors = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('sponsors').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch sponsors.' });
  if (data.length === 0) return res.json({ success: true, sponsors: [] });

  const { data: sponsorships } = await supabase
    .from('sponsorships')
    .select('sponsor_id, amount')
    .in('sponsor_id', data.map((s) => s.id));

  const totalBySponsor = {};
  (sponsorships || []).forEach((s) => {
    totalBySponsor[s.sponsor_id] = (totalBySponsor[s.sponsor_id] || 0) + Number(s.amount || 0);
  });

  return res.json({
    success: true,
    sponsors: data.map((s) => ({ ...serializeSponsor(s), totalCommitted: totalBySponsor[s.id] || 0 }))
  });
};

const createSponsor = async (req, res) => {
  const { name, contactName, email, phone, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required.' });

  const { data: sponsor, error } = await supabase
    .from('sponsors')
    .insert({ org_id: req.user.orgId, name, contact_name: contactName, email, phone, notes })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create sponsor.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.SPONSOR_CREATED,
    entityType: 'sponsor', entityId: sponsor.id, entityLabel: sponsor.name
  });

  return res.json({ success: true, sponsor: serializeSponsor(sponsor) });
};

const updateSponsor = async (req, res) => {
  const { id } = req.params;
  const { name, contactName, email, phone, notes } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (contactName !== undefined) updates.contact_name = contactName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (notes !== undefined) updates.notes = notes;

  const { data: sponsor, error } = await supabase
    .from('sponsors').update(updates).eq('id', id).eq('org_id', req.user.orgId).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update sponsor.' });
  return res.json({ success: true, sponsor: serializeSponsor(sponsor) });
};

const deleteSponsor = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('sponsors').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete sponsor.' });
  return res.json({ success: true });
};

// ============================================================
// Sponsorships
// ============================================================

const STATUSES = ['Proposed', 'Active', 'Completed', 'Cancelled'];

const getSponsorships = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('sponsorships').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  if (req.query.sponsorId) query = query.eq('sponsor_id', req.query.sponsorId);
  if (req.query.projectId) query = query.eq('project_id', req.query.projectId);
  if (req.query.campaignId) query = query.eq('campaign_id', req.query.campaignId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch sponsorships.' });
  return res.json({ success: true, sponsorships: data.map(serializeSponsorship) });
};

const createSponsorship = async (req, res) => {
  const { sponsorId, projectId, campaignId, packageName, amount, status, startDate, endDate, notes } = req.body;
  if (!sponsorId) return res.status(400).json({ success: false, error: 'sponsorId is required.' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });

  const { data: sponsor } = await supabase.from('sponsors').select('name').eq('id', sponsorId).eq('org_id', req.user.orgId).maybeSingle();
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor not found.' });

  const { data: sponsorship, error } = await supabase
    .from('sponsorships')
    .insert({
      org_id: req.user.orgId, sponsor_id: sponsorId, project_id: projectId || null, campaign_id: campaignId || null,
      package_name: packageName, amount: amount || null, status: status || 'Proposed',
      start_date: startDate || null, end_date: endDate || null, notes
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not record sponsorship.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.SPONSORSHIP_RECORDED,
    entityType: 'sponsorship', entityId: sponsorship.id, entityLabel: `${sponsor.name}${packageName ? ` — ${packageName}` : ''}`
  });

  return res.json({ success: true, sponsorship: serializeSponsorship(sponsorship) });
};

const updateSponsorship = async (req, res) => {
  const { id } = req.params;
  const { packageName, amount, status, startDate, endDate, notes } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });

  const updates = {};
  if (packageName !== undefined) updates.package_name = packageName;
  if (amount !== undefined) updates.amount = amount || null;
  if (status !== undefined) updates.status = status;
  if (startDate !== undefined) updates.start_date = startDate || null;
  if (endDate !== undefined) updates.end_date = endDate || null;
  if (notes !== undefined) updates.notes = notes;

  const { data: sponsorship, error } = await supabase
    .from('sponsorships').update(updates).eq('id', id).eq('org_id', req.user.orgId).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update sponsorship.' });
  return res.json({ success: true, sponsorship: serializeSponsorship(sponsorship) });
};

const deleteSponsorship = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('sponsorships').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete sponsorship.' });
  return res.json({ success: true });
};

module.exports = {
  getSponsors, createSponsor, updateSponsor, deleteSponsor,
  getSponsorships, createSponsorship, updateSponsorship, deleteSponsorship
};
