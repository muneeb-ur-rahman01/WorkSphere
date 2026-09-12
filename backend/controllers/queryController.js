const supabase = require('../config/supabase');
const { serializeQuery } = require('../utils/serializers');
const { sendQueryReceivedEmail, sendQueryResponseEmail } = require('../utils/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Very small in-memory throttle, same pattern as the forgot-password
// endpoint in authController.js — slows down a script hammering the
// public form. Keyed by email; resets automatically after the window.
const submitAttempts = new Map(); // email -> timestamp of last submission
const SUBMIT_COOLDOWN_MS = 30 * 1000; // 1 submission per email per 30s

// POST /api/queries (public, no auth)
// body: { name, email, subject, message, website }
// `website` is an invisible honeypot field on the frontend form — a real
// visitor never fills it in, only a bot filling every field would, so a
// non-empty value is silently treated as spam (we still return success so
// the bot doesn't learn anything from the response).
const submitQuery = async (req, res) => {
  const { name, email, subject, message, website } = req.body;

  if (website) {
    return res.json({ success: true }); // honeypot tripped — silently drop
  }

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  }
  if (name.length > 120 || subject.length > 200 || message.length > 4000) {
    return res.status(400).json({ success: false, error: 'One of the fields is too long.' });
  }

  const key = email.toLowerCase();
  const lastAttempt = submitAttempts.get(key);
  if (lastAttempt && Date.now() - lastAttempt < SUBMIT_COOLDOWN_MS) {
    return res.status(429).json({ success: false, error: 'Please wait a moment before sending another message.' });
  }
  submitAttempts.set(key, Date.now());

  const { data: query, error } = await supabase
    .from('queries')
    .insert({ name, email, subject, message, status: 'New' })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not submit your query. Please try again.' });

  // Super Admin dashboard notification (system-wide, org_id null)
  await supabase.from('notifications').insert({
    org_id: null,
    title: 'New Query Received',
    message: `${name} (${email}) sent a message: "${subject}"`,
    type: 'Query',
    target_role: 'SuperAdmin'
  });

  try {
    await sendQueryReceivedEmail({ to: email, name, subject });
  } catch (mailErr) {
    console.error('[submitQuery] Failed to send confirmation email:', mailErr.message);
  }

  return res.json({ success: true, query: serializeQuery(query) });
};

// GET /api/queries (SuperAdmin only)  query: status=All|New|In Progress|Resolved
const getQueries = async (req, res) => {
  const { status } = req.query;
  let q = supabase.from('queries').select('*').order('created_at', { ascending: false });
  if (status && status !== 'All') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch queries.' });
  return res.json({ success: true, queries: data.map(serializeQuery) });
};

// PATCH /api/queries/:id/status (SuperAdmin only)  body: { status }
const updateQueryStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['New', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }

  const { data: query, error } = await supabase.from('queries').update({ status }).eq('id', id).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update query status.' });
  return res.json({ success: true, query: serializeQuery(query) });
};

// POST /api/queries/:id/respond (SuperAdmin only)  body: { message }
// The actual "respond directly through email" workflow — sends the reply
// to the original submitter's email and marks the query Resolved, keeping
// a copy of the response text tied to the query it answers.
const respondToQuery = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Please write a response message.' });
  }

  const { data: existing, error: fetchErr } = await supabase.from('queries').select('*').eq('id', id).maybeSingle();
  if (fetchErr || !existing) return res.status(404).json({ success: false, error: 'Query not found.' });

  const { data: query, error } = await supabase
    .from('queries')
    .update({
      status: 'Resolved',
      response_text: message,
      responded_by: req.user.id,
      responded_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not save the response.' });

  try {
    await sendQueryResponseEmail({
      to: existing.email,
      name: existing.name,
      originalSubject: existing.subject,
      responseText: message
    });
  } catch (mailErr) {
    console.error('[respondToQuery] Failed to send response email:', mailErr.message);
    return res.json({
      success: true,
      query: serializeQuery(query),
      warning: 'Response saved, but the email could not be sent. Please check SMTP configuration.'
    });
  }

  return res.json({ success: true, query: serializeQuery(query) });
};

module.exports = { submitQuery, getQueries, updateQueryStatus, respondToQuery };
