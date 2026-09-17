const validateCreateCamp = (req, res, next) => {
  const {
    title,
    location,
    date,
    time,
    description,
    imageUrl
  } = req.body;

  if (!title || !location || !date) {
    return res.status(400).json({
      success: false,
      error: 'Title, location and date are required.'
    });
  }

  req.campData = {
    title,
    location,
    date,
    time,
    description,
    imageUrl
  };

  next();
};

const validateUpdateCamp = (req, res, next) => {
  const {
    title,
    location,
    date,
    time,
    description,
    status,
    imageUrl
  } = req.body;

  req.campData = {
    title,
    location,
    date,
    time,
    description,
    status,
    imageUrl
  };

  next();
};

module.exports = {
  validateCreateCamp,
  validateUpdateCamp
};