const auditLogService = require('../services/auditServices');

const getAuditLogs = async (req, res) => {
  try {
    const logs = await auditLogService.getAuditLogs({
      user: req.user,
      filters: req.auditLogFilters
    });

    return res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('GET AUDIT LOGS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Could not fetch audit logs.'
    });
  }
};

module.exports = {
  getAuditLogs
};