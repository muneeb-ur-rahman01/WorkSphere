const paymentService = require('../services/paymentServices');

const initiatePayment = async (req, res) => {
  try {
    const result =
      await paymentService.initiatePayment({
        user: req.user,
        orgId: req.paymentData.orgId,
        plan: req.paymentData.plan
      });

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not initiate payment.'
    });
  }
};

const handleCallback = async (req, res) => {
  try {
    const result =
      await paymentService.handleCallback({
        query: req.query,
        body: req.body
      });

    return res.redirect(result.redirectUrl);
  } catch (err) {
    console.error(
      '[paymentController] callback error:',
      err.message
    );

    const clientUrl =
      process.env.CLIENT_URL ||
      'http://localhost:5173';

    return res.redirect(
      `${clientUrl}/payment/result?status=failed&reason=callback_error`
    );
  }
};

const getPayments = async (req, res) => {
  try {
    const payments =
      await paymentService.getPayments({
        user: req.user
      });

    return res.json({
      success: true,
      payments
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not fetch payments.'
    });
  }
};

const getPlans = (req, res) => {
  const plans = paymentService.getPlans();

  return res.json({
    success: true,
    plans
  });
};

const markRefunded = async (req, res) => {
  try {
    await paymentService.markRefunded({
      user: req.user,
      id: req.params.id,
      reference: req.refundData.reference
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not refund payment.'
    });
  }
};

module.exports = {
  initiatePayment,
  handleCallback,
  getPayments,
  getPlans,
  markRefunded
};