const availabilityMiddleware = (
  req,
  res,
  next
) => {
  const { campId, status } = req.body;

  if (!campId || !status) {
    return res.status(400).json({
      success: false,
      error:
        'Camp and status are required.'
    });
  }

  req.availabilityData = {
    campId,
    status
  };

  next();
};

module.exports = availabilityMiddleware;