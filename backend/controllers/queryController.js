const queryService = require('../services/queryService');

const submitQuery = async (req, res) => {
  // Honeypot tripped — silently drop spam.
  if (req.querySpam) {
    console.log('[submitQuery] Honeypot triggered. Query dropped.');

    return res.json({
      success: true,
      message: 'Query received.'
    });
  }

  try {
    console.log('[submitQuery] Request received:', {
      name: req.queryData?.name,
      email: req.queryData?.email,
      subject: req.queryData?.subject
    });

    const query = await queryService.submitQuery(req.queryData);

    console.log('[submitQuery] Query saved successfully:', query);

    return res.json({
      success: true,
      query
    });
  } catch (err) {
    console.error('[submitQuery] ERROR:', err);

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not submit your query. Please try again.'
    });
  }
};

const getQueries = async (req, res) => {
  try {
    const queries = await queryService.getQueries({
      user: req.user,
      status: req.query.status
    });

    return res.json({
      success: true,
      queries
    });
  } catch (err) {
    console.error('[getQueries] ERROR:', err);

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch queries.'
    });
  }
};

const updateQueryStatus = async (req, res) => {
  try {
    const query = await queryService.updateQueryStatus({
      user: req.user,
      id: req.params.id,
      status: req.queryStatus
    });

    return res.json({
      success: true,
      query
    });
  } catch (err) {
    console.error('[updateQueryStatus] ERROR:', err);

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update query status.'
    });
  }
};

const respondToQuery = async (req, res) => {
  try {
    const result = await queryService.respondToQuery({
      user: req.user,
      id: req.params.id,
      message: req.responseMessage,
      respondedBy: req.user.id
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[respondToQuery] ERROR:', err);

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not save the response.'
    });
  }
};

module.exports = {
  submitQuery,
  getQueries,
  updateQueryStatus,
  respondToQuery
};