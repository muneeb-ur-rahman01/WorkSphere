const supabase = require('../config/supabase');

// ============================================================
// Small helpers used to write clear, detailed notification text
// (what was scheduled, when, where and by whom) so the toast that pops
// up on a staff member's dashboard is useful on its own.
// ============================================================

const getActorName = async (user) => {
  try {
    const { data } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    return data?.full_name || 'Your organization admin';
  } catch (err) {
    return 'Your organization admin';
  }
};

const formatDateLabel = (value) => {
  if (!value) return 'a date to be confirmed';

  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTimeLabel = (value) => {
  if (!value) return '';

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);

  if (!match) return String(value);

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${suffix}`;
};

const clip = (text, max = 140) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();

  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

module.exports = {
  getActorName,
  formatDateLabel,
  formatTimeLabel,
  clip
};
