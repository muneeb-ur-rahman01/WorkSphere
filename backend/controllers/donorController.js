const supabase = require('../config/supabase');
const { serializeDonor, serializeDonation } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

const DONOR_TYPES = ['Individual', 'Organization'];

// ============================================================
// Donors
// ============================================================

// GET /api/donors — SuperAdmin sees all (optionally ?orgId=), everyone else scoped to their own org.
// Includes a computed `totalDonated` per donor so the list view doesn't
// need a second round trip.
const getDonors = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('donors').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch donors.' });
  if (data.length === 0) return res.json({ success: true, donors: [] });

  const { data: donations } = await supabase
    .from('donations')
    .select('donor_id, amount')
    .in('donor_id', data.map((d) => d.id));

  const totalByDonor = {};
  (donations || []).forEach((d) => {
    totalByDonor[d.donor_id] = (totalByDonor[d.donor_id] || 0) + Number(d.amount);
  });

  return res.json({
    success: true,
    donors: data.map((d) => ({ ...serializeDonor(d), totalDonated: totalByDonor[d.id] || 0 }))
  });
};

// POST /api/donors (OrgAdmin)
const createDonor = async (req, res) => {
  const { donorType, name, email, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required.' });
  if (donorType && !DONOR_TYPES.includes(donorType)) return res.status(400).json({ success: false, error: 'Invalid donor type.' });

  const { data: donor, error } = await supabase
    .from('donors')
    .insert({ org_id: req.user.orgId, donor_type: donorType || 'Individual', name, email, phone, address, notes })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create donor.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: AUDIT_ACTIONS.DONOR_CREATED,
    entityType: 'donor',
    entityId: donor.id,
    entityLabel: donor.name
  });

  return res.json({ success: true, donor: serializeDonor(donor) });
};

// PATCH /api/donors/:id (OrgAdmin, own org)
const updateDonor = async (req, res) => {
  const { id } = req.params;
  const { donorType, name, email, phone, address, notes } = req.body;
  if (donorType && !DONOR_TYPES.includes(donorType)) return res.status(400).json({ success: false, error: 'Invalid donor type.' });

  const updates = {};
  if (donorType !== undefined) updates.donor_type = donorType;
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (notes !== undefined) updates.notes = notes;

  const { data: donor, error } = await supabase
    .from('donors')
    .update(updates)
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update donor.' });
  return res.json({ success: true, donor: serializeDonor(donor) });
};

// DELETE /api/donors/:id (OrgAdmin, own org) — cascades to their donation records
const deleteDonor = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('donors').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete donor.' });
  return res.json({ success: true });
};

// ============================================================
// Donations
// ============================================================

// GET /api/donations?donorId=&projectId=&campaignId=
const getDonations = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('donations').select('*').order('donation_date', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  if (req.query.donorId) query = query.eq('donor_id', req.query.donorId);
  if (req.query.projectId) query = query.eq('project_id', req.query.projectId);
  if (req.query.campaignId) query = query.eq('campaign_id', req.query.campaignId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch donations.' });
  return res.json({ success: true, donations: data.map(serializeDonation) });
};

// POST /api/donations (OrgAdmin)  body: { donorId, projectId, campaignId, amount, currency, donationDate, paymentMethod, isRecurring, notes }
const createDonation = async (req, res) => {
  const { donorId, projectId, campaignId, amount, currency, donationDate, paymentMethod, isRecurring, notes } = req.body;
  if (!donorId || !amount) return res.status(400).json({ success: false, error: 'donorId and amount are required.' });
  if (Number(amount) <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero.' });

  const { data: donor } = await supabase.from('donors').select('id, name').eq('id', donorId).eq('org_id', req.user.orgId).maybeSingle();
  if (!donor) return res.status(404).json({ success: false, error: 'Donor not found.' });

  const { data: donation, error } = await supabase
    .from('donations')
    .insert({
      org_id: req.user.orgId,
      donor_id: donorId,
      project_id: projectId || null,
      campaign_id: campaignId || null,
      amount,
      currency: currency || 'PKR',
      donation_date: donationDate || new Date().toISOString().slice(0, 10),
      payment_method: paymentMethod || null,
      is_recurring: Boolean(isRecurring),
      notes,
      recorded_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not record donation.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: AUDIT_ACTIONS.DONATION_RECORDED,
    entityType: 'donation',
    entityId: donation.id,
    entityLabel: `${donor.name} — ${currency || 'PKR'} ${amount}`
  });

  return res.json({ success: true, donation: serializeDonation(donation) });
};

// DELETE /api/donations/:id (OrgAdmin, own org)
const deleteDonation = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('donations').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete donation record.' });
  return res.json({ success: true });
};

module.exports = {
  getDonors,
  createDonor,
  updateDonor,
  deleteDonor,
  getDonations,
  createDonation,
  deleteDonation
};
