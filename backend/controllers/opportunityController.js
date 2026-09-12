const supabase = require('../config/supabase');
const { serializeOpportunity, serializeOpportunityApplication } = require('../utils/serializers');
const { sendOpportunityApplicationReceivedEmail } = require('../utils/mailer');

const OPPORTUNITY_TYPES = ['Job', 'Internship', 'Fellowship', 'Scholarship', 'Volunteer', 'Training', 'Other'];
const REMOTE_STATUSES = ['Remote', 'OnSite', 'Hybrid'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// Org Admin — manage own organization's opportunities
// ============================================================

// GET /api/opportunities (OrgAdmin) — all statuses, own org only
const getMyOpportunities = async (req, res) => {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('org_id', req.user.orgId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch opportunities.' });
  return res.json({ success: true, opportunities: data.map(serializeOpportunity) });
};

// POST /api/opportunities (OrgAdmin)
const createOpportunity = async (req, res) => {
  const {
    title, description, opportunityType, eligibility, requirements, applicationDeadline,
    location, remoteStatus, applicationInstructions, applicationLink, contactInfo, imageUrl
  } = req.body;

  if (!title) return res.status(400).json({ success: false, error: 'Title is required.' });
  if (opportunityType && !OPPORTUNITY_TYPES.includes(opportunityType)) {
    return res.status(400).json({ success: false, error: 'Invalid opportunity type.' });
  }
  if (remoteStatus && !REMOTE_STATUSES.includes(remoteStatus)) {
    return res.status(400).json({ success: false, error: 'Invalid remote status.' });
  }

  const { data: opp, error } = await supabase
    .from('opportunities')
    .insert({
      org_id: req.user.orgId,
      title,
      description,
      opportunity_type: opportunityType || 'Job',
      eligibility,
      requirements,
      application_deadline: applicationDeadline || null,
      location,
      remote_status: remoteStatus || 'OnSite',
      application_instructions: applicationInstructions,
      application_link: applicationLink,
      contact_info: contactInfo,
      image_url: imageUrl,
      status: 'Draft'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create opportunity.' });
  return res.json({ success: true, opportunity: serializeOpportunity(opp) });
};

// PATCH /api/opportunities/:id (OrgAdmin) — edit fields and/or status
// (status: Draft | Published | Unpublished — covers publish/unpublish)
const updateOpportunity = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, opportunityType, eligibility, requirements, applicationDeadline,
    location, remoteStatus, applicationInstructions, applicationLink, contactInfo, imageUrl, status
  } = req.body;

  const { data: existing, error: fetchErr } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .maybeSingle();
  if (fetchErr || !existing) return res.status(404).json({ success: false, error: 'Opportunity not found.' });

  if (status && !['Draft', 'Published', 'Unpublished'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (opportunityType !== undefined) updates.opportunity_type = opportunityType;
  if (eligibility !== undefined) updates.eligibility = eligibility;
  if (requirements !== undefined) updates.requirements = requirements;
  if (applicationDeadline !== undefined) updates.application_deadline = applicationDeadline || null;
  if (location !== undefined) updates.location = location;
  if (remoteStatus !== undefined) updates.remote_status = remoteStatus;
  if (applicationInstructions !== undefined) updates.application_instructions = applicationInstructions;
  if (applicationLink !== undefined) updates.application_link = applicationLink;
  if (contactInfo !== undefined) updates.contact_info = contactInfo;
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'Published') updates.publish_date = new Date().toISOString();
  }

  const { data: opp, error } = await supabase.from('opportunities').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update opportunity.' });
  return res.json({ success: true, opportunity: serializeOpportunity(opp) });
};

// DELETE /api/opportunities/:id (OrgAdmin)
const deleteOpportunity = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('opportunities').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete opportunity.' });
  return res.json({ success: true });
};

// GET /api/opportunities/:id/applications (OrgAdmin) — internal applicants only
const getOpportunityApplications = async (req, res) => {
  const { id } = req.params;
  const { data: opp, error: fetchErr } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .maybeSingle();
  if (fetchErr || !opp) return res.status(404).json({ success: false, error: 'Opportunity not found.' });

  const { data, error } = await supabase
    .from('opportunity_applications')
    .select('*')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch applications.' });
  return res.json({ success: true, applications: data.map(serializeOpportunityApplication) });
};

// ============================================================
// Public — no auth. Home Page opportunity browsing/apply.
// ============================================================

// GET /api/public/opportunities — published only, org must be Active
const getPublicOpportunities = async (req, res) => {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, organizations(name, status)')
    .eq('status', 'Published')
    .order('publish_date', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch opportunities.' });

  const items = (data || [])
    .filter((o) => o.organizations?.status === 'Active')
    .map((o) => ({ ...serializeOpportunity(o), orgName: o.organizations?.name }));

  return res.json({ success: true, opportunities: items });
};

// GET /api/public/opportunities/:id
const getPublicOpportunityById = async (req, res) => {
  const { id } = req.params;
  const { data: o, error } = await supabase
    .from('opportunities')
    .select('*, organizations(name, status)')
    .eq('id', id)
    .eq('status', 'Published')
    .maybeSingle();

  if (error || !o || o.organizations?.status !== 'Active') {
    return res.status(404).json({ success: false, error: 'Opportunity not found.' });
  }
  return res.json({ success: true, opportunity: { ...serializeOpportunity(o), orgName: o.organizations?.name } });
};

// POST /api/public/opportunities/:id/apply — only valid when the
// opportunity has no external application_link (those use "Apply Now" to
// redirect off-platform instead).
const applyToOpportunity = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, coverNote, resumeUrl } = req.body;

  if (!name || !email) return res.status(400).json({ success: false, error: 'Name and email are required.' });
  if (!EMAIL_REGEX.test(email)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });

  const { data: opp, error: fetchErr } = await supabase
    .from('opportunities')
    .select('*, organizations(name)')
    .eq('id', id)
    .eq('status', 'Published')
    .maybeSingle();
  if (fetchErr || !opp) return res.status(404).json({ success: false, error: 'Opportunity not found.' });
  if (opp.application_link) {
    return res.status(400).json({ success: false, error: 'This opportunity accepts applications via an external link.' });
  }

  const { data: application, error } = await supabase
    .from('opportunity_applications')
    .insert({ opportunity_id: id, name, email, phone, cover_note: coverNote, resume_url: resumeUrl, status: 'New' })
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: 'Could not submit your application.' });

  await supabase.from('notifications').insert({
    org_id: opp.org_id,
    title: 'New Opportunity Application',
    message: `${name} applied to "${opp.title}".`,
    type: 'Opportunity',
    target_role: 'OrgAdmin'
  });

  try {
    await sendOpportunityApplicationReceivedEmail({
      to: email,
      name,
      opportunityTitle: opp.title,
      orgName: opp.organizations?.name
    });
  } catch (mailErr) {
    console.error('[applyToOpportunity] Failed to send confirmation email:', mailErr.message);
  }

  return res.json({ success: true, application: serializeOpportunityApplication(application) });
};

module.exports = {
  getMyOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunityApplications,
  getPublicOpportunities,
  getPublicOpportunityById,
  applyToOpportunity
};
