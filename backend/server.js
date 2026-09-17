require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const net = require('net');

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
const publicOpportunityRoutes = require('./routes/publicOpportunityRoutes');
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

const {
  checkExpiringSubscriptions
} = require('./services/notificationService');

const {
  suspendOverdueOrganizations,
  notifyExpiringTrials
} = require('./utils/subscriptionScheduler');

const app = express();

console.log('ROUTE TYPES:');
console.log('authRoutes:', typeof authRoutes);
console.log('organizationRoutes:', typeof organizationRoutes);
console.log('userRoutes:', typeof userRoutes);
console.log('campRoutes:', typeof campRoutes);
console.log('eventRoutes:', typeof eventRoutes);
console.log('meetingRoutes:', typeof meetingRoutes);
console.log('analyticsRoutes:', typeof analyticsRoutes);
console.log('taskRoutes:', typeof taskRoutes);
console.log('notificationRoutes:', typeof notificationRoutes);
console.log('availabilityRoutes:', typeof availabilityRoutes);
console.log('prescriptionRoutes:', typeof prescriptionRoutes);
console.log('paymentRoutes:', typeof paymentRoutes);
console.log('billingRoutes:', typeof billingRoutes);
console.log('discussionRoutes:', typeof discussionRoutes);
console.log('permissionRoutes:', typeof permissionRoutes);
console.log('queryRoutes:', typeof queryRoutes);
console.log('visibilityRoutes:', typeof visibilityRoutes);
console.log('publicRoutes:', typeof publicRoutes);
console.log('opportunityRoutes:', typeof opportunityRoutes);
console.log('publicOpportunityRoutes:', typeof publicOpportunityRoutes);
console.log('auditLogRoutes:', typeof auditLogRoutes);
console.log('platformSettingsRoutes:', typeof platformSettingsRoutes);
console.log('projectRoutes:', typeof projectRoutes);
console.log('campaignRoutes:', typeof campaignRoutes);
console.log('donorRoutes:', typeof donorRoutes);
console.log('donationRoutes:', typeof donationRoutes);
console.log('volunteerRoutes:', typeof volunteerRoutes);
console.log('sponsorRoutes:', typeof sponsorRoutes);
console.log('partnerRoutes:', typeof partnerRoutes);
console.log('beneficiaryRoutes:', typeof beneficiaryRoutes);
console.log('expenseRoutes:', typeof expenseRoutes);
console.log('documentRoutes:', typeof documentRoutes);
console.log('directoryRoutes:', typeof directoryRoutes);
console.log('connectionRoutes:', typeof connectionRoutes);

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    message: 'WorkSphere API is running.'
  })
);

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
app.use('/api/public/opportunities', publicOpportunityRoutes);
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
app.use((req, res) =>
  res.status(404).json({
    success: false,
    error: 'Route not found.'
  })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (
    err.name === 'MulterError' ||
    /audio files/i.test(err.message || '')
  ) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Something went wrong on the server.'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CampOS backend running on http://localhost:${PORT}`);

  // Subscription expiry watcher
  checkExpiringSubscriptions().catch((err) =>
    console.error(
      '[Subscription Watcher] initial run failed:',
      err.message
    )
  );

  setInterval(() => {
    checkExpiringSubscriptions().catch((err) =>
      console.error(
        '[Subscription Watcher] run failed:',
        err.message
      )
    );
  }, 60 * 60 * 1000);

  // 7-day free trial / renewal overdue sweep
  suspendOverdueOrganizations().catch((err) =>
    console.error(
      '[Subscription Scheduler] initial run failed:',
      err.message
    )
  );

  setInterval(() => {
    suspendOverdueOrganizations().catch((err) =>
      console.error(
        '[Subscription Scheduler] run failed:',
        err.message
      )
    );
  }, 60 * 60 * 1000);

  // Trial-ending-soon reminder
  notifyExpiringTrials().catch((err) =>
    console.error(
      '[Trial Reminder] initial run failed:',
      err.message
    )
  );

  setInterval(() => {
    notifyExpiringTrials().catch((err) =>
      console.error(
        '[Trial Reminder] run failed:',
        err.message
      )
    );
  }, 60 * 60 * 1000);
});

// ============================================================
// TEMPORARY SMTP CONNECTIVITY TEST
// Remove this after testing
// ============================================================


const socket = net.createConnection({
  host: '142.250.4.109',
  port: 465,
  family: 4,
  timeout: 10000
});

socket.on('connect', () => {
  console.log('[SMTP TEST] IPv4 port 587 CONNECTED');
  socket.destroy();
});

socket.on('timeout', () => {
  console.log('[SMTP TEST] IPv4 port 587 TIMEOUT');
  socket.destroy();
});

socket.on('error', (err) => {
  console.log('[SMTP TEST] IPv4 ERROR:', {
    code: err.code,
    message: err.message
  });
});