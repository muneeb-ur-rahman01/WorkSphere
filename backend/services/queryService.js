const supabase = require('../config/supabase');

const { serializeQuery } = require('../utils/serializers');

const {
  sendQueryReceivedEmail,
  sendQueryResponseEmail
} = require('../utils/mailer');

const submitAttempts = new Map();

const SUBMIT_COOLDOWN_MS = 30 * 1000;

const submitQuery = async ({
  name,
  email,
  subject,
  message
}) => {
  const key = email.toLowerCase();

  // Prevent repeated submissions from the same email
  const lastAttempt = submitAttempts.get(key);

  if (
    lastAttempt &&
    Date.now() - lastAttempt < SUBMIT_COOLDOWN_MS
  ) {
    const error = new Error(
      'Please wait a moment before sending another message.'
    );

    error.statusCode = 429;

    throw error;
  }

  submitAttempts.set(key, Date.now());

  console.log('[submitQuery] Attempting database insert:', {
    name,
    email,
    subject,
    messageLength: message?.length
  });

  // Insert query into Supabase
  const {
    data: query,
    error
  } = await supabase
    .from('queries')
    .insert({
      name,
      email,
      subject,
      message,
      status: 'New'
    })
    .select()
    .single();

  // IMPORTANT: Log actual Supabase error
  if (error) {
    console.error(
      '[submitQuery] SUPABASE INSERT ERROR:',
      error
    );

    const err = new Error(
      error.message ||
      'Could not submit your query. Please try again.'
    );

    err.statusCode = 500;

    throw err;
  }

  console.log(
    '[submitQuery] Query inserted successfully:',
    query
  );

  // Create admin notification
  const {
    error: notificationError
  } = await supabase
    .from('notifications')
    .insert({
      org_id: null,
      title: 'New Query Received',
      message: `${name} (${email}) sent a message: "${subject}"`,
      type: 'Query',
      target_role: 'SuperAdmin'
    });

  if (notificationError) {
    console.error(
      '[submitQuery] NOTIFICATION INSERT ERROR:',
      notificationError
    );

    // Don't fail the query submission
    // because the main query was already saved.
  }

  // Send confirmation email
  try {
    await sendQueryReceivedEmail({
      to: email,
      name,
      subject
    });

    console.log(
      '[submitQuery] Confirmation email sent:',
      email
    );
  } catch (mailErr) {
    console.error(
      '[submitQuery] CONFIRMATION EMAIL ERROR:',
      mailErr.message
    );

    // Don't fail the query submission
    // because database insert succeeded.
  }

  return serializeQuery(query);
};

const getQueries = async ({ status }) => {
  let query = supabase
    .from('queries')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (status && status !== 'All') {
    query = query.eq('status', status);
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    console.error(
      '[getQueries] SUPABASE ERROR:',
      error
    );

    const err = new Error(
      error.message || 'Could not fetch queries.'
    );

    err.statusCode = 500;

    throw err;
  }

  return data.map(serializeQuery);
};

const updateQueryStatus = async ({
  id,
  status
}) => {
  const {
    data: query,
    error
  } = await supabase
    .from('queries')
    .update({
      status
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(
      '[updateQueryStatus] SUPABASE ERROR:',
      error
    );

    const err = new Error(
      error.message || 'Could not update query status.'
    );

    err.statusCode = 500;

    throw err;
  }

  return serializeQuery(query);
};

const respondToQuery = async ({
  id,
  message,
  respondedBy
}) => {
  // Find existing query
  const {
    data: existing,
    error: fetchErr
  } = await supabase
    .from('queries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    console.error(
      '[respondToQuery] FETCH ERROR:',
      fetchErr
    );

    const err = new Error(
      'Could not find the query.'
    );

    err.statusCode = 500;

    throw err;
  }

  if (!existing) {
    const err = new Error(
      'Query not found.'
    );

    err.statusCode = 404;

    throw err;
  }

  // Save response
  const {
    data: query,
    error
  } = await supabase
    .from('queries')
    .update({
      status: 'Resolved',
      response_text: message,
      responded_by: respondedBy,
      responded_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(
      '[respondToQuery] SUPABASE UPDATE ERROR:',
      error
    );

    const err = new Error(
      error.message ||
      'Could not save the response.'
    );

    err.statusCode = 500;

    throw err;
  }

  // Send response email
  try {
    await sendQueryResponseEmail({
      to: existing.email,
      name: existing.name,
      originalSubject: existing.subject,
      responseText: message
    });
  } catch (mailErr) {
    console.error(
      '[respondToQuery] RESPONSE EMAIL ERROR:',
      mailErr.message
    );

    return {
      query: serializeQuery(query),
      warning:
        'Response saved, but the email could not be sent. Please check SMTP configuration.'
    };
  }

  return {
    query: serializeQuery(query)
  };
};

module.exports = {
  submitQuery,
  getQueries,
  updateQueryStatus,
  respondToQuery
};