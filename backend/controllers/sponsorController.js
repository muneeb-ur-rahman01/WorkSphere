const sponsorService = require('../services/sponsorService');

const getSponsors = async (req, res) => {
  try {
    const sponsors = await sponsorService.getSponsors({
      user: req.user,
      ...req.sponsorFilters
    });

    return res.json({
      success: true,
      sponsors
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch sponsors.'
    });
  }
};

const createSponsor = async (req, res) => {
  try {
    const sponsor = await sponsorService.createSponsor({
      user: req.user,
      ...req.sponsorData
    });

    return res.json({
      success: true,
      sponsor
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create sponsor.'
    });
  }
};

const updateSponsor = async (req, res) => {
  try {
    const sponsor = await sponsorService.updateSponsor({
      user: req.user,
      id: req.params.id,
      ...req.sponsorData
    });

    return res.json({
      success: true,
      sponsor
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update sponsor.'
    });
  }
};

const deleteSponsor = async (req, res) => {
  try {
    await sponsorService.deleteSponsor({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete sponsor.'
    });
  }
};

const getSponsorships = async (req, res) => {
  try {
    const sponsorships = await sponsorService.getSponsorships({
      user: req.user,
      ...req.sponsorshipFilters
    });

    return res.json({
      success: true,
      sponsorships
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch sponsorships.'
    });
  }
};

const createSponsorship = async (req, res) => {
  try {
    const sponsorship = await sponsorService.createSponsorship({
      user: req.user,
      ...req.sponsorshipData
    });

    return res.json({
      success: true,
      sponsorship
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not record sponsorship.'
    });
  }
};

const updateSponsorship = async (req, res) => {
  try {
    const sponsorship = await sponsorService.updateSponsorship({
      user: req.user,
      id: req.params.id,
      ...req.sponsorshipData
    });

    return res.json({
      success: true,
      sponsorship
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update sponsorship.'
    });
  }
};

const deleteSponsorship = async (req, res) => {
  try {
    await sponsorService.deleteSponsorship({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete sponsorship.'
    });
  }
};

module.exports = {
  getSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getSponsorships,
  createSponsorship,
  updateSponsorship,
  deleteSponsorship
};