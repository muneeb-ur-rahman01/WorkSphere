const validateInitiatePayment = (req, res, next) => {
  const { orgId, plan } = req.body;

  if (!orgId || !plan) {
    return res.status(400).json({
      success: false,
      error: 'A valid organization and subscription plan are required.'
    });
  }

  req.paymentData = {
    orgId,
    plan
  };

  next();
};

const validateRefund = (req, res, next) => {
  req.refundData = {
    reference: req.body.reference
  };

  next();
};

const validatePaymentId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Payment ID is required.'
    });
  }

  next();
};

module.exports = {
  validateInitiatePayment,
  validateRefund,
  validatePaymentId
};