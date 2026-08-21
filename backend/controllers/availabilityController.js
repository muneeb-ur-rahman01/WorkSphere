const supabase = require('../config/supabase');
const { serializeAvailability } = require('../utils/serializers');

// GET /api/availability
const getAvailability = async (req, res) => {
  let query = supabase.from('availability').select('*, camps!inner(org_id)');

  if (req.user.role !== 'SuperAdmin') {
    query = query.eq('camps.org_id', req.user.orgId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch availability.' });
  return res.json({ success: true, availability: data.map(serializeAvailability) });
};

// POST /api/availability (upsert)  body: { campId, status }  userId = current user
const updateAvailability = async (req, res) => {
  const { campId, status } = req.body;
  if (!campId || !status) {
    return res.status(400).json({ success: false, error: 'Camp and status are required.' });
  }

  const { data, error } = await supabase
    .from('availability')
    .upsert(
      { camp_id: campId, user_id: req.user.id, status, updated_at: new Date().toISOString() },
      { onConflict: 'camp_id,user_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update availability.' });
  return res.json({ success: true, availability: serializeAvailability(data) });
};

module.exports = { getAvailability, updateAvailability };
