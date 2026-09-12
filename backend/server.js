require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const userRoutes = require('./routes/userRoutes');
const campRoutes = require('./routes/campRoutes');
const eventRoutes = require('./routes/eventRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const queryRoutes = require('./routes/queryRoutes');
const visibilityRoutes = require('./routes/visibilityRoutes');
const publicRoutes = require('./routes/publicRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const platformSettingsRoutes = require('./routes/platformSettingsRoutes');
const projectRoutes = require('./routes/projectRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const donorRoutes = require('./routes/donorRoutes');
const donationRoutes = require('./routes/donationRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const documentRoutes = require('./routes/documentRoutes');
const directoryRoutes = require('./routes/directoryRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const { checkExpiringSubscriptions } = require('./controllers/notificationController');
const { suspendOverdueOrganizations, notifyExpiringTrials } = require('./utils/subscriptionScheduler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'CampOS API is running.' }));

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/discussion-groups', discussionRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/visibility-requests', visibilityRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/connections', connectionRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found.' }));

// Global error handler (also catches Multer upload errors, e.g. file too large)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError' || /audio files/i.test(err.message || '')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CampOS backend running on http://localhost:${PORT}`);

  // Subscription expiry watcher: notifies OrgAdmins + SuperAdmin when a
  // plan is about to expire. Runs once on boot, then every hour.
  checkExpiringSubscriptions().catch((err) => console.error('[Subscription Watcher] initial run failed:', err.message));
  setInterval(() => {
    checkExpiringSubscriptions().catch((err) => console.error('[Subscription Watcher] run failed:', err.message));
  }, 60 * 60 * 1000);

  // 7-day free trial / renewal overdue sweep — see
  // backend/utils/subscriptionScheduler.js. Restoration only ever happens
  // via a verified payment (paymentController.handleCallback), never here.
  suspendOverdueOrganizations().catch((err) => console.error('[Subscription Scheduler] initial run failed:', err.message));
  setInterval(() => {
    suspendOverdueOrganizations().catch((err) => console.error('[Subscription Scheduler] run failed:', err.message));
  }, 60 * 60 * 1000);

  // Trial-ending-soon reminder (email + in-app), 2 days out — see
  // backend/utils/subscriptionScheduler.js.
  notifyExpiringTrials().catch((err) => console.error('[Trial Reminder] initial run failed:', err.message));
  setInterval(() => {
    notifyExpiringTrials().catch((err) => console.error('[Trial Reminder] run failed:', err.message));
  }, 60 * 60 * 1000);
});
