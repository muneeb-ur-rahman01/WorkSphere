const supabase = require('../config/supabase');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// Canonical settings keys with sane defaults. Add new entries here as new
// platform-wide settings become configurable — no other backend change
// needed for a plain get/set. This registry is what the Platform Settings
// screen renders, so unset keys still show up with their default value.
const SETTING_DEFAULTS = {
  platform_name: { value: 'CampOS', label: 'Platform Name', description: 'Shown in emails and platform-facing copy.' },
  support_email: { value: '', label: 'Support Email', description: 'Contact address shown to organizations needing help.' },
  support_phone: { value: '', label: 'Support Phone', description: 'Optional contact number shown alongside the support email.' },
  maintenance_banner_message: { value: '', label: 'Maintenance Banner Message', description: 'If set, shown as a dismissible banner to all logged-in users. Leave blank to hide.' }
};

// GET /api/platform-settings (SuperAdmin)
const getPlatformSettings = async (req, res) => {
  const { data, error } = await supabase.from('platform_settings').select('*');
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch platform settings.' });

  const stored = Object.fromEntries(data.map((r) => [r.key, r]));
  const settings = Object.entries(SETTING_DEFAULTS).map(([key, meta]) => ({
    key,
    label: meta.label,
    description: meta.description,
    value: stored[key] ? stored[key].value : meta.value,
    updatedAt: stored[key]?.updated_at || null
  }));

  return res.json({ success: true, settings });
};

// PUT /api/platform-settings/:key  body: { value }
const updatePlatformSetting = async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (!Object.prototype.hasOwnProperty.call(SETTING_DEFAULTS, key)) {
    return res.status(400).json({ success: false, error: 'Unknown setting key.' });
  }

  const { data: existing } = await supabase.from('platform_settings').select('value').eq('key', key).maybeSingle();

  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_by: req.user.id, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return res.status(500).json({ success: false, error: 'Could not update setting.' });

  await logAudit({
    actor: req.user,
    orgId: null,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    entityType: 'platform_setting',
    entityId: null,
    entityLabel: SETTING_DEFAULTS[key].label,
    previousValue: { value: existing?.value ?? SETTING_DEFAULTS[key].value },
    newValue: { value }
  });

  return res.json({ success: true });
};

module.exports = { SETTING_DEFAULTS, getPlatformSettings, updatePlatformSetting };
