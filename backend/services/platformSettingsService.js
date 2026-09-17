const supabase = require('../config/supabase');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

// Canonical platform settings registry.
const SETTING_DEFAULTS = {
  platform_name: {
    value: 'CampOS',
    label: 'Platform Name',
    description:
      'Shown in emails and platform-facing copy.'
  },

  support_email: {
    value: '',
    label: 'Support Email',
    description:
      'Contact address shown to organizations needing help.'
  },

  support_phone: {
    value: '',
    label: 'Support Phone',
    description:
      'Optional contact number shown alongside the support email.'
  },

  maintenance_banner_message: {
    value: '',
    label: 'Maintenance Banner Message',
    description:
      'If set, shown as a dismissible banner to all logged-in users. Leave blank to hide.'
  }
};

const getPlatformSettings = async () => {
  const {
    data,
    error
  } = await supabase
    .from('platform_settings')
    .select('*');

  if (error) {
    const err = new Error(
      'Could not fetch platform settings.'
    );
    err.statusCode = 500;
    throw err;
  }

  const stored = Object.fromEntries(
    data.map((row) => [row.key, row])
  );

  return Object.entries(SETTING_DEFAULTS).map(
    ([key, meta]) => ({
      key,
      label: meta.label,
      description: meta.description,
      value: stored[key]
        ? stored[key].value
        : meta.value,
      updatedAt:
        stored[key]?.updated_at || null
    })
  );
};

const updatePlatformSetting = async ({
  user,
  key,
  value
}) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      SETTING_DEFAULTS,
      key
    )
  ) {
    const err = new Error(
      'Unknown setting key.'
    );
    err.statusCode = 400;
    throw err;
  }

  const {
    data: existing
  } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key,
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'key'
      }
    );

  if (error) {
    const err = new Error(
      'Could not update setting.'
    );
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: null,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    entityType: 'platform_setting',
    entityId: null,
    entityLabel:
      SETTING_DEFAULTS[key].label,
    previousValue: {
      value:
        existing?.value ??
        SETTING_DEFAULTS[key].value
    },
    newValue: {
      value
    }
  });

  return true;
};

module.exports = {
  SETTING_DEFAULTS,
  getPlatformSettings,
  updatePlatformSetting
};