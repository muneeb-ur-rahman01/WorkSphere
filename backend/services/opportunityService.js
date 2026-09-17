const supabase = require('../config/supabase');

const {
  serializeOpportunity,
  serializeOpportunityApplication
} = require('../utils/serializers');

const {
  sendOpportunityApplicationReceivedEmail
} = require('../utils/mailer');

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ============================================================
// Org Admin
// ============================================================

const getMyOpportunities = async ({ orgId }) => {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError('Could not fetch opportunities.');
  }

  return data.map(serializeOpportunity);
};

const createOpportunity = async ({ orgId, opportunityData }) => {
  const {
    title,
    description,
    opportunityType,
    eligibility,
    requirements,
    applicationDeadline,
    location,
    remoteStatus,
    applicationInstructions,
    applicationLink,
    contactInfo,
    imageUrl
  } = opportunityData;

  const { data: opp, error } = await supabase
    .from('opportunities')
    .insert({
      org_id: orgId,
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

  if (error) {
    throw createError('Could not create opportunity.');
  }

  return serializeOpportunity(opp);
};

const updateOpportunity = async ({ orgId, id, opportunityData }) => {
  const {
    title,
    description,
    opportunityType,
    eligibility,
    requirements,
    applicationDeadline,
    location,
    remoteStatus,
    applicationInstructions,
    applicationLink,
    contactInfo,
    imageUrl,
    status
  } = opportunityData;

  const { data: existing, error: fetchErr } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw createError('Opportunity not found.', 404);
  }

  const updates = {};

  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (opportunityType !== undefined) updates.opportunity_type = opportunityType;
  if (eligibility !== undefined) updates.eligibility = eligibility;
  if (requirements !== undefined) updates.requirements = requirements;

  if (applicationDeadline !== undefined) {
    updates.application_deadline = applicationDeadline || null;
  }

  if (location !== undefined) updates.location = location;
  if (remoteStatus !== undefined) updates.remote_status = remoteStatus;

  if (applicationInstructions !== undefined) {
    updates.application_instructions = applicationInstructions;
  }

  if (applicationLink !== undefined) {
    updates.application_link = applicationLink;
  }

  if (contactInfo !== undefined) updates.contact_info = contactInfo;
  if (imageUrl !== undefined) updates.image_url = imageUrl;

  if (status !== undefined) {
    updates.status = status;

    if (status === 'Published') {
      updates.publish_date = new Date().toISOString();
    }
  }

  const { data: opp, error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    throw createError('Could not update opportunity.');
  }

  return serializeOpportunity(opp);
};

const deleteOpportunity = async ({ orgId, id }) => {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) {
    throw createError('Could not delete opportunity.');
  }

  return true;
};

const getOpportunityApplications = async ({ orgId, id }) => {
  const { data: opp, error: fetchErr } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr || !opp) {
    throw createError('Opportunity not found.', 404);
  }

  const { data, error } = await supabase
    .from('opportunity_applications')
    .select('*')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError('Could not fetch applications.');
  }

  return data.map(serializeOpportunityApplication);
};

// ============================================================
// Public
// ============================================================

const getPublicOpportunities = async () => {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, organizations(name, status)')
    .eq('status', 'Published')
    .order('publish_date', { ascending: false });

  if (error) {
    throw createError('Could not fetch opportunities.');
  }

  return (data || [])
    .filter((o) => o.organizations?.status === 'Active')
    .map((o) => ({
      ...serializeOpportunity(o),
      orgName: o.organizations?.name
    }));
};

const getPublicOpportunityById = async ({ id }) => {
  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .select('*, organizations(name, status)')
    .eq('id', id)
    .eq('status', 'Published')
    .maybeSingle();

  if (
    error ||
    !opportunity ||
    opportunity.organizations?.status !== 'Active'
  ) {
    throw createError('Opportunity not found.', 404);
  }

  return {
    ...serializeOpportunity(opportunity),
    orgName: opportunity.organizations?.name
  };
};

const applyToOpportunity = async ({ id, applicationData }) => {
  const {
    name,
    email,
    phone,
    coverNote,
    resumeUrl
  } = applicationData;

  const { data: opp, error: fetchErr } = await supabase
    .from('opportunities')
    .select('*, organizations(name)')
    .eq('id', id)
    .eq('status', 'Published')
    .maybeSingle();

  if (fetchErr || !opp) {
    throw createError('Opportunity not found.', 404);
  }

  if (opp.application_link) {
    throw createError(
      'This opportunity accepts applications via an external link.',
      400
    );
  }

  const { data: application, error } = await supabase
    .from('opportunity_applications')
    .insert({
      opportunity_id: id,
      name,
      email,
      phone,
      cover_note: coverNote,
      resume_url: resumeUrl,
      status: 'New'
    })
    .select()
    .single();

  if (error) {
    throw createError('Could not submit your application.');
  }

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
    console.error(
      '[applyToOpportunity] Failed to send confirmation email:',
      mailErr.message
    );
  }

  return serializeOpportunityApplication(application);
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