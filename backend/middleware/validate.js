const { validationResult } = require('express-validator');

// Run all express-validator rules, then return a consistent error response.
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array({ onlyFirstError: true }).map((error) => ({
    field: error.path,
    message: error.msg
  }));

  return res.status(400).json({
    success: false,
    error: errors[0]?.message || 'Invalid input.',
    errors
  });
};

module.exports = {
  validate
};  