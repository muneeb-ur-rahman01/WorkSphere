const { validate } = require('../middleware/validate');
const { requiredString, optionalString, enumField, amountField, dateField, uuidBody } = require('./common');

const PROJECT_STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];
const CAMPAIGN_STATUSES = ['Planning', 'Active', 'Completed', 'Cancelled'];
const CAMPAIGN_TYPES = ['Fundraising', 'Awareness', 'Outreach', 'Other'];

const createProjectValidator = validate([
  requiredString('title', { min: 2, max: 150, label: 'Title' }),
  optionalString('description', { max: 5000 }),
  optionalString('objectives', { max: 5000 }),
  optionalString('location', { max: 200 }),
  dateField('startDate', { label: 'Start date' }),
  dateField('endDate', { label: 'End date' }),
  amountField('budget', { label: 'Budget', optional: true }),
  enumField('status', PROJECT_STATUSES, { label: 'Status', optional: true })
]);

const updateProjectValidator = validate([
  optionalString('title', { max: 150, label: 'Title' }),
  optionalString('description', { max: 5000 }),
  optionalString('objectives', { max: 5000 }),
  optionalString('location', { max: 200 }),
  dateField('startDate', { label: 'Start date' }),
  dateField('endDate', { label: 'End date' }),
  amountField('budget', { label: 'Budget', optional: true }),
  enumField('status', PROJECT_STATUSES, { label: 'Status', optional: true })
]);

const teamMemberValidator = validate([
  uuidBody('userId', { label: 'User' }),
  optionalString('roleOnEntity', { max: 100, label: 'Role' })
]);

const createCampaignValidator = validate([
  requiredString('title', { min: 2, max: 150, label: 'Title' }),
  optionalString('description', { max: 5000 }),
  optionalString('objective', { max: 5000 }),
  enumField('campaignType', CAMPAIGN_TYPES, { label: 'Campaign type', optional: true }),
  dateField('startDate', { label: 'Start date' }),
  dateField('endDate', { label: 'End date' }),
  amountField('goalAmount', { label: 'Goal amount', optional: true }),
  enumField('status', CAMPAIGN_STATUSES, { label: 'Status', optional: true })
]);

const updateCampaignValidator = validate([
  optionalString('title', { max: 150, label: 'Title' }),
  optionalString('description', { max: 5000 }),
  optionalString('objective', { max: 5000 }),
  enumField('campaignType', CAMPAIGN_TYPES, { label: 'Campaign type', optional: true }),
  dateField('startDate', { label: 'Start date' }),
  dateField('endDate', { label: 'End date' }),
  amountField('goalAmount', { label: 'Goal amount', optional: true }),
  enumField('status', CAMPAIGN_STATUSES, { label: 'Status', optional: true })
]);

module.exports = {
  createProjectValidator, updateProjectValidator, teamMemberValidator,
  createCampaignValidator, updateCampaignValidator
};
