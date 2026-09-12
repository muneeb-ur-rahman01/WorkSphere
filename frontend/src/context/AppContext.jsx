import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../Config/apiConfig';

export const AppContext = createContext();

// Small helper to normalize axios errors into the { success:false, error:'' } shape
// that every page in this app already expects from context functions.
const asError = (err, fallback) => ({
  success: false,
  error: err?.response?.data?.error || fallback
});

export const AppProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [camps, setCamps] = useState([]);
  const [events, setEvents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [discussionGroups, setDiscussionGroups] = useState([]);
  const [queries, setQueries] = useState([]); // SuperAdmin only — external user queries inbox
  const [visibilityRequests, setVisibilityRequests] = useState([]); // event/camp public-visibility requests
  const [opportunities, setOpportunities] = useState([]); // OrgAdmin only — own org's opportunities
  const [projects, setProjects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [partners, setPartners] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [connections, setConnections] = useState([]);
  const [myPermissions, setMyPermissions] = useState([]); // Accessibility: section keys granted to the current user
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('campos_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('campos_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('campos_current_user');
    }
  }, [currentUser]);

  // ===========================================================
  // Real-time-ish data loading: fetch fresh data from the DB
  // whenever the logged-in user changes, then keep it in sync
  // by refetching after every mutation and via short polling.
  // ===========================================================
  const refreshAll = useCallback(async () => {
    if (!currentUser) return;
    try {
      const requests = [
        api.get('/users').then(r => setUsers(r.data.users)).catch(() => {}),
        api.get('/camps').then(r => setCamps(r.data.camps)).catch(() => {}),
        api.get('/events').then(r => setEvents(r.data.events)).catch(() => {}),
        api.get('/meetings').then(r => setMeetings(r.data.meetings)).catch(() => {}),
        api.get('/tasks').then(r => setTasks(r.data.tasks)).catch(() => {}),
        api.get('/notifications').then(r => setNotifications(r.data.notifications)).catch(() => {}),
        api.get('/availability').then(r => setAvailability(r.data.availability)).catch(() => {}),
        api.get('/discussion-groups').then(r => setDiscussionGroups(r.data.groups)).catch(() => {}),
        api.get('/permissions/me').then(r => setMyPermissions(r.data.sections)).catch(() => {})
      ];
      // Projects / Campaigns / Donors / Donations / Volunteers: visible to
      // every org member (mutation is what's permission-gated), same as
      // Camps/Events/Tasks above. SuperAdmin doesn't have a single org in
      // context, so these stay OrgAdmin/staff-only for now — the Super
      // Admin System Monitoring screen gets its cross-org numbers from
      // /organizations and /users instead.
      if (currentUser.role !== 'SuperAdmin') {
        requests.push(api.get('/projects').then(r => setProjects(r.data.projects)).catch(() => {}));
        requests.push(api.get('/campaigns').then(r => setCampaigns(r.data.campaigns)).catch(() => {}));
        requests.push(api.get('/donors').then(r => setDonors(r.data.donors)).catch(() => {}));
        requests.push(api.get('/donations').then(r => setDonations(r.data.donations)).catch(() => {}));
        requests.push(api.get('/volunteers').then(r => setVolunteers(r.data.volunteers)).catch(() => {}));
        requests.push(api.get('/sponsors').then(r => setSponsors(r.data.sponsors)).catch(() => {}));
        requests.push(api.get('/sponsors/sponsorships/all').then(r => setSponsorships(r.data.sponsorships)).catch(() => {}));
        requests.push(api.get('/partners').then(r => setPartners(r.data.partners)).catch(() => {}));
        requests.push(api.get('/beneficiaries').then(r => setBeneficiaries(r.data.beneficiaries)).catch(() => {}));
        requests.push(api.get('/beneficiaries/enrollments/all').then(r => setEnrollments(r.data.enrollments)).catch(() => {}));
        requests.push(api.get('/expenses').then(r => setExpenses(r.data.expenses)).catch(() => {}));
        requests.push(api.get('/documents').then(r => setDocuments(r.data.documents)).catch(() => {}));
      }
      if (currentUser.role === 'SuperAdmin') {
        requests.push(api.get('/organizations').then(r => setOrganizations(r.data.organizations)).catch(() => {}));
        requests.push(api.get('/queries').then(r => setQueries(r.data.queries)).catch(() => {}));
        requests.push(api.get('/visibility-requests', { params: { status: 'All' } }).then(r => setVisibilityRequests(r.data.requests)).catch(() => {}));
      } else {
        requests.push(
          api.get('/organizations/me')
            .then(r => setOrganizations(r.data.organization ? [r.data.organization] : []))
            .catch(() => {})
        );
        if (currentUser.role === 'OrgAdmin') {
          requests.push(api.get('/visibility-requests/mine').then(r => setVisibilityRequests(r.data.requests)).catch(() => {}));
          requests.push(api.get('/opportunities').then(r => setOpportunities(r.data.opportunities)).catch(() => {}));
          // AI Module (prescription transcription) moved here from Staff/Intern
          // — see backend/routes/prescriptionRoutes.js, now OrgAdmin-only.
          requests.push(api.get('/prescriptions').then(r => setPrescriptions(r.data.prescriptions)).catch(() => {}));
          // Cross-Organization Connections (spec section 16) — OrgAdmin only.
          requests.push(api.get('/connections').then(r => setConnections(r.data.connections)).catch(() => {}));
        }
      }
      await Promise.all(requests);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshAll();
      // light polling so dashboards feel "real-time" without needing websockets
      const interval = setInterval(refreshAll, 15000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [currentUser, refreshAll]);

  // ===================
  // Auth Operations
  // ===================
  const login = async (email, password, expectedRoleDomain) => {
    try {
      const res = await api.post('/auth/login', { email, password, roleDomain: expectedRoleDomain });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setCurrentUser(user);
      return { success: true, user };
    } catch (err) {
      return asError(err, 'Invalid email or password.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setUsers([]);
    setCamps([]);
    setEvents([]);
    setMeetings([]);
    setTasks([]);
    setNotifications([]);
    setAvailability([]);
    setOrganizations([]);
    setDiscussionGroups([]);
    setMyPermissions([]);
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update password.');
    }
  };

  // Forgot / Reset Password (no auth required - user isn't logged in yet)
  const forgotPassword = async (email) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return { success: true, message: res.data.message };
    } catch (err) {
      return asError(err, 'Something went wrong. Please try again.');
    }
  };

  const validateResetToken = async (token) => {
    try {
      await api.get(`/auth/reset-password/${token}/validate`);
      return { success: true };
    } catch (err) {
      return asError(err, 'This reset link is invalid or has expired.');
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      return { success: true, message: res.data.message };
    } catch (err) {
      return asError(err, 'Could not reset password. Please try again.');
    }
  };

  // ===================
  // SaaS Operations (Super Admin)
  // ===================
  const registerOrganization = async (orgName, adminName, email, password, plan = 'Basic') => {
    try {
      const res = await api.post('/auth/register-organization', { orgName, adminName, email, password, plan });
      return { success: true, orgId: res.data.orgId, amountDue: res.data.amountDue };
    } catch (err) {
      return asError(err, 'Registration failed.');
    }
  };

  const updateOrgStatus = async (orgId, newStatus) => {
    try {
      await api.patch(`/organizations/${orgId}/status`, { status: newStatus });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update organization.');
    }
  };

  const deleteOrganization = async (orgId) => {
    try {
      await api.delete(`/organizations/${orgId}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete organization.');
    }
  };

  const setPublicEventsEnabled = async (orgId, enabled) => {
    try {
      await api.patch(`/organizations/${orgId}/public-events`, { enabled });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update public visibility setting.');
    }
  };

  // ===================
  // Organization Operations (Org Admin)
  // ===================

  // Public self-registration -> account goes Pending until an OrgAdmin approves it
  const registerStaff = async (fullName, email, password, role, orgId) => {
    try {
      await api.post('/auth/register-staff', { fullName, email, password, role, orgId });
      return { success: true };
    } catch (err) {
      return asError(err, 'Registration failed.');
    }
  };

  // Admin adds staff directly from the dashboard and sets their initial password;
  // the account is Active immediately (staff can change their password later in Settings).
  const createStaffByAdmin = async (fullName, email, password, role) => {
    try {
      await api.post('/users', { fullName, email, password, role });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not add staff member.');
    }
  };

  const updateStaffStatus = async (userId, newStatus) => {
    try {
      await api.patch(`/users/${userId}/status`, { status: newStatus });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update user status.');
    }
  };

  const deleteStaff = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not remove staff member.');
    }
  };

  const updateStaffRole = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update role.');
    }
  };

  const assignMentor = async (internId, mentorName) => {
    try {
      await api.patch(`/users/${internId}/mentor`, { mentorName });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not assign mentor.');
    }
  };

  // ===================
  // Camp Operations (independent from Events)
  // ===================
  const createCamp = async (title, location, date, description, extra = {}) => {
    try {
      const res = await api.post('/camps', { title, location, date, description, ...extra });
      await refreshAll();
      return res.data.camp?.id;
    } catch (err) {
      return null;
    }
  };

  const updateCamp = async (campId, updates) => {
    try {
      await api.patch(`/camps/${campId}`, updates);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update camp.');
    }
  };

  const deleteCamp = async (campId) => {
    try {
      await api.delete(`/camps/${campId}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete camp.');
    }
  };

  // ===================
  // Event Operations (independent from Camps)
  // ===================
  const createEvent = async (title, location, date, description, eventType, extra = {}) => {
    try {
      const res = await api.post('/events', { title, location, date, description, eventType, ...extra });
      await refreshAll();
      return res.data.event?.id;
    } catch (err) {
      return null;
    }
  };

  const updateEvent = async (eventId, updates) => {
    try {
      await api.patch(`/events/${eventId}`, updates);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update event.');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete event.');
    }
  };

  // ===================
  // Meeting Operations (OrgAdmin schedules, visible org-wide once created)
  // ===================
  const createMeeting = async (subject, meetingType, date, time, meetingLink) => {
    try {
      const res = await api.post('/meetings', { subject, meetingType, date, time, meetingLink });
      await refreshAll();
      return { success: true, id: res.data.meeting?.id };
    } catch (err) {
      return asError(err, 'Could not create meeting.');
    }
  };

  const updateMeeting = async (meetingId, updates) => {
    try {
      await api.patch(`/meetings/${meetingId}`, updates);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update meeting.');
    }
  };

  // Thin wrapper around updateMeeting for the common "add a recap after the
  // meeting happened" action — also flips status to Completed if it wasn't already.
  const addMeetingSummary = async (meetingId, summary) => {
    try {
      await api.patch(`/meetings/${meetingId}`, { summary, status: 'Completed' });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not save the meeting summary.');
    }
  };

  const deleteMeeting = async (meetingId) => {
    try {
      await api.delete(`/meetings/${meetingId}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete meeting.');
    }
  };

  // ===================
  // Accessibility (staff section permissions)
  // ===================
  const getAssignableSections = async () => {
    try {
      const res = await api.get('/permissions/sections');
      return { success: true, sections: res.data.sections };
    } catch (err) {
      return asError(err, 'Could not load sections.');
    }
  };

  const getUserPermissions = async (userId) => {
    try {
      const res = await api.get('/permissions', { params: { userId } });
      return { success: true, sections: res.data.sections };
    } catch (err) {
      return asError(err, 'Could not load permissions.');
    }
  };

  const grantPermission = async (userId, sectionKey) => {
    try {
      await api.post('/permissions', { userId, sectionKey });
      if (currentUser?.id === userId) await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not grant access.');
    }
  };

  const revokePermission = async (userId, sectionKey) => {
    try {
      await api.delete('/permissions', { data: { userId, sectionKey } });
      if (currentUser?.id === userId) await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not revoke access.');
    }
  };

  // ===========================================================
  // Projects
  // ===========================================================
  const createProject = async (payload) => {
    try {
      const res = await api.post('/projects', payload);
      await refreshAll();
      return { success: true, project: res.data.project };
    } catch (err) {
      return asError(err, 'Could not create project.');
    }
  };
  const updateProject = async (id, payload) => {
    try {
      await api.patch(`/projects/${id}`, payload);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update project.');
    }
  };
  const deleteProject = async (id) => {
    try {
      await api.delete(`/projects/${id}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete project.');
    }
  };
  const getProjectTeam = async (id) => {
    try {
      const res = await api.get(`/projects/${id}/team`);
      return { success: true, members: res.data.members };
    } catch (err) {
      return asError(err, 'Could not load project team.');
    }
  };
  const addProjectTeamMember = async (id, userId, roleOnEntity) => {
    try {
      await api.post(`/projects/${id}/team`, { userId, roleOnEntity });
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not add team member.');
    }
  };
  const removeProjectTeamMember = async (id, userId) => {
    try {
      await api.delete(`/projects/${id}/team/${userId}`);
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not remove team member.');
    }
  };

  // ===========================================================
  // Campaigns
  // ===========================================================
  const createCampaign = async (payload) => {
    try {
      const res = await api.post('/campaigns', payload);
      await refreshAll();
      return { success: true, campaign: res.data.campaign };
    } catch (err) {
      return asError(err, 'Could not create campaign.');
    }
  };
  const updateCampaign = async (id, payload) => {
    try {
      await api.patch(`/campaigns/${id}`, payload);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update campaign.');
    }
  };
  const deleteCampaign = async (id) => {
    try {
      await api.delete(`/campaigns/${id}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete campaign.');
    }
  };
  const getCampaignTeam = async (id) => {
    try {
      const res = await api.get(`/campaigns/${id}/team`);
      return { success: true, members: res.data.members };
    } catch (err) {
      return asError(err, 'Could not load campaign team.');
    }
  };
  const addCampaignTeamMember = async (id, userId, roleOnEntity) => {
    try {
      await api.post(`/campaigns/${id}/team`, { userId, roleOnEntity });
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not add team member.');
    }
  };
  const removeCampaignTeamMember = async (id, userId) => {
    try {
      await api.delete(`/campaigns/${id}/team/${userId}`);
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not remove team member.');
    }
  };

  // ===========================================================
  // Donors & Donations
  // ===========================================================
  const createDonor = async (payload) => {
    try {
      const res = await api.post('/donors', payload);
      await refreshAll();
      return { success: true, donor: res.data.donor };
    } catch (err) {
      return asError(err, 'Could not create donor.');
    }
  };
  const updateDonor = async (id, payload) => {
    try {
      await api.patch(`/donors/${id}`, payload);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update donor.');
    }
  };
  const deleteDonor = async (id) => {
    try {
      await api.delete(`/donors/${id}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete donor.');
    }
  };
  const createDonation = async (payload) => {
    try {
      const res = await api.post('/donations', payload);
      await refreshAll();
      return { success: true, donation: res.data.donation };
    } catch (err) {
      return asError(err, 'Could not record donation.');
    }
  };
  const deleteDonation = async (id) => {
    try {
      await api.delete(`/donations/${id}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete donation record.');
    }
  };

  // ===========================================================
  // Volunteers (CRM layer on top of role='Volunteer' staff users)
  // ===========================================================
  const updateVolunteerProfile = async (userId, payload) => {
    try {
      await api.put(`/volunteers/${userId}/profile`, payload);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update volunteer profile.');
    }
  };

  // ===========================================================
  // Sponsors & Sponsorships
  // ===========================================================
  const createSponsor = async (payload) => {
    try { const res = await api.post('/sponsors', payload); await refreshAll(); return { success: true, sponsor: res.data.sponsor }; }
    catch (err) { return asError(err, 'Could not create sponsor.'); }
  };
  const updateSponsor = async (id, payload) => {
    try { await api.patch(`/sponsors/${id}`, payload); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update sponsor.'); }
  };
  const deleteSponsor = async (id) => {
    try { await api.delete(`/sponsors/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not delete sponsor.'); }
  };
  const createSponsorship = async (payload) => {
    try { const res = await api.post('/sponsors/sponsorships', payload); await refreshAll(); return { success: true, sponsorship: res.data.sponsorship }; }
    catch (err) { return asError(err, 'Could not record sponsorship.'); }
  };
  const updateSponsorship = async (id, payload) => {
    try { await api.patch(`/sponsors/sponsorships/${id}`, payload); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update sponsorship.'); }
  };
  const deleteSponsorship = async (id) => {
    try { await api.delete(`/sponsors/sponsorships/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not delete sponsorship.'); }
  };

  // ===========================================================
  // Partners (Partnership Approval — OrgAdmin only)
  // ===========================================================
  const createPartner = async (payload) => {
    try { const res = await api.post('/partners', payload); await refreshAll(); return { success: true, partner: res.data.partner }; }
    catch (err) { return asError(err, 'Could not create partner.'); }
  };
  const updatePartner = async (id, payload) => {
    try { await api.patch(`/partners/${id}`, payload); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update partner.'); }
  };
  const updatePartnerStatus = async (id, status) => {
    try { await api.patch(`/partners/${id}/status`, { status }); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update partner status.'); }
  };
  const deletePartner = async (id) => {
    try { await api.delete(`/partners/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not delete partner.'); }
  };

  // ===========================================================
  // Beneficiaries & Program Enrollment
  // ===========================================================
  const createBeneficiary = async (payload) => {
    try { const res = await api.post('/beneficiaries', payload); await refreshAll(); return { success: true, beneficiary: res.data.beneficiary }; }
    catch (err) { return asError(err, 'Could not register beneficiary.'); }
  };
  const updateBeneficiary = async (id, payload) => {
    try { await api.patch(`/beneficiaries/${id}`, payload); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update beneficiary.'); }
  };
  const deleteBeneficiary = async (id) => {
    try { await api.delete(`/beneficiaries/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not delete beneficiary.'); }
  };
  const createEnrollment = async (payload) => {
    try { const res = await api.post('/beneficiaries/enrollments', payload); await refreshAll(); return { success: true, enrollment: res.data.enrollment }; }
    catch (err) { return asError(err, 'Could not enroll beneficiary.'); }
  };
  const updateEnrollment = async (id, payload) => {
    try { await api.patch(`/beneficiaries/enrollments/${id}`, payload); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update enrollment.'); }
  };
  const deleteEnrollment = async (id) => {
    try { await api.delete(`/beneficiaries/enrollments/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not remove enrollment.'); }
  };

  // ===========================================================
  // Expenses (Expense Approval — OrgAdmin only)
  // ===========================================================
  const createExpense = async (payload) => {
    try { const res = await api.post('/expenses', payload); await refreshAll(); return { success: true, expense: res.data.expense }; }
    catch (err) { return asError(err, 'Could not submit expense.'); }
  };
  const updateExpenseStatus = async (id, status) => {
    try { await api.patch(`/expenses/${id}/status`, { status }); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update expense status.'); }
  };
  const deleteExpense = async (id) => {
    try { await api.delete(`/expenses/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not delete expense.'); }
  };

  // ===========================================================
  // Document Management (Document Approval — OrgAdmin only)
  // ===========================================================
  const createDocument = async (payload) => {
    try { const res = await api.post('/documents', payload); await refreshAll(); return { success: true, document: res.data.document }; }
    catch (err) { return asError(err, 'Could not upload document.'); }
  };
  const updateDocumentStatus = async (id, status) => {
    try { await api.patch(`/documents/${id}/status`, { status }); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not update document status.'); }
  };
  const deleteDocument = async (id) => {
    try { await api.delete(`/documents/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not delete document.'); }
  };

  // ===========================================================
  // Organization Public Profile (Directory) & Subscription Cancellation
  // ===========================================================
  const updateMyDirectoryProfile = async (payload) => {
    try {
      await api.patch('/organizations/me/directory-profile', payload);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update organization profile.');
    }
  };

  const setMyCancellationRequest = async (cancel) => {
    try {
      await api.patch('/organizations/me/cancellation', { cancel });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update cancellation request.');
    }
  };

  // ===========================================================
  // Cross-Organization Directory & Connections (spec section 16)
  // Directory is fetched on-demand (search-driven) rather than in
  // refreshAll's polling loop; connections refresh with everything else.
  // ===========================================================
  const fetchDirectory = async (params = {}) => {
    try {
      const res = await api.get('/directory', { params });
      setDirectory(res.data.organizations);
      return { success: true, organizations: res.data.organizations };
    } catch (err) {
      return asError(err, 'Could not load the organization directory.');
    }
  };

  const createConnectionRequest = async (targetOrgId, message) => {
    try {
      const res = await api.post('/connections', { targetOrgId, message });
      await refreshAll();
      return { success: true, connection: res.data.connection };
    } catch (err) {
      return asError(err, 'Could not send connection request.');
    }
  };
  const respondToConnection = async (id, status) => {
    try { await api.patch(`/connections/${id}/status`, { status }); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not respond to connection.'); }
  };
  const withdrawConnection = async (id) => {
    try { await api.delete(`/connections/${id}`); await refreshAll(); return { success: true }; }
    catch (err) { return asError(err, 'Could not withdraw connection.'); }
  };
  const fetchConnectionMessages = async (id) => {
    try {
      const res = await api.get(`/connections/${id}/messages`);
      return { success: true, messages: res.data.messages };
    } catch (err) {
      return asError(err, 'Could not load messages.');
    }
  };
  const sendConnectionMessage = async (id, message) => {
    try {
      const res = await api.post(`/connections/${id}/messages`, { message });
      return { success: true, message: res.data.message };
    } catch (err) {
      return asError(err, 'Could not send message.');
    }
  };

  // ===========================================================
  // Audit Logs (Super Admin: platform-wide / one org via orgId filter;
  // Org Admin: always scoped server-side to their own org). Fetched
  // on-demand by the Audit Logs screens rather than in refreshAll's
  // polling loop, since the log can grow large and isn't needed on
  // every dashboard.
  // ===========================================================
  const fetchAuditLogs = async (params = {}) => {
    try {
      const res = await api.get('/audit-logs', { params });
      return { success: true, logs: res.data.logs };
    } catch (err) {
      return asError(err, 'Could not load audit logs.');
    }
  };

  // ===========================================================
  // Platform Settings (Super Admin only — see spec section 13)
  // ===========================================================
  const fetchPlatformSettings = async () => {
    try {
      const res = await api.get('/platform-settings');
      return { success: true, settings: res.data.settings };
    } catch (err) {
      return asError(err, 'Could not load platform settings.');
    }
  };

  const updatePlatformSetting = async (key, value) => {
    try {
      await api.put(`/platform-settings/${key}`, { value });
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update setting.');
    }
  };

  // Role always has access; staff need an explicit grant for the section.
  const hasAccess = (sectionKey) =>
    currentUser?.role === 'OrgAdmin' || currentUser?.role === 'SuperAdmin' || myPermissions.includes(sectionKey);

  // ===================
  // Analytics & Reports
  // ===================
  const getOrgAnalytics = async (range = 'weekly') => {
    try {
      const res = await api.get('/analytics/org', { params: { range } });
      return { success: true, data: res.data };
    } catch (err) {
      return asError(err, 'Could not load analytics.');
    }
  };

  const getPlatformAnalytics = async (range = 'weekly') => {
    try {
      const res = await api.get('/analytics/platform', { params: { range } });
      return { success: true, data: res.data };
    } catch (err) {
      return asError(err, 'Could not load platform analytics.');
    }
  };

  // ===================
  // Task Operations
  // ===================
  const createTask = async (title, description, assignedToId, priority, dueDate) => {
    try {
      await api.post('/tasks', { title, description, assignedToId, priority, dueDate });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not create task.');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update task.');
    }
  };

  // Task Comments / Discussion Thread
  const getTaskComments = async (taskId) => {
    try {
      const res = await api.get(`/tasks/${taskId}/comments`);
      return { success: true, comments: res.data.comments };
    } catch (err) {
      return asError(err, 'Could not load comments.');
    }
  };

  const addTaskComment = async (taskId, message) => {
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { message });
      // Refresh in the background so unread badges elsewhere (task lists,
      // sidebar) update too - the modal itself updates instantly from the
      // returned comment without waiting on this.
      refreshAll();
      return { success: true, comment: res.data.comment };
    } catch (err) {
      return asError(err, 'Could not post comment.');
    }
  };

  const markTaskCommentsRead = async (taskId) => {
    try {
      await api.patch(`/tasks/${taskId}/comments/read`);
      // Silently sync the unread flag on the local task list too.
      setTasks((prev) => prev.map((t) => {
        if (t.id !== taskId) return t;
        const isAssignee = t.assignedToId === currentUser?.id;
        return isAssignee ? { ...t, hasUnreadForAssignee: false } : { ...t, hasUnreadForAdmin: false };
      }));
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update read status.');
    }
  };

  // ===================
  // Discussion Groups (Org Chat)
  // ===================
  const refreshDiscussionGroups = async () => {
    try {
      const res = await api.get('/discussion-groups');
      setDiscussionGroups(res.data.groups);
    } catch {
      // silent - the next poll cycle will retry
    }
  };

  const getGroupMessages = async (groupId) => {
    try {
      const res = await api.get(`/discussion-groups/${groupId}/messages`);
      return { success: true, messages: res.data.messages };
    } catch (err) {
      return asError(err, 'Could not load messages.');
    }
  };

  const sendGroupMessage = async (groupId, message) => {
    try {
      const res = await api.post(`/discussion-groups/${groupId}/messages`, { message });
      // Lightweight refresh so the sidebar's unread/last-message preview
      // updates too - the chat pane itself updates instantly from the
      // returned message without waiting on this.
      refreshDiscussionGroups();
      return { success: true, message: res.data.message };
    } catch (err) {
      return asError(err, 'Could not send message.');
    }
  };

  const markGroupRead = async (groupId) => {
    try {
      await api.patch(`/discussion-groups/${groupId}/read`);
      setDiscussionGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g)));
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update read status.');
    }
  };

  const createDiscussionGroup = async (name, description, memberIds = []) => {
    try {
      const res = await api.post('/discussion-groups', { name, description, memberIds });
      await refreshDiscussionGroups();
      return { success: true, group: res.data.group };
    } catch (err) {
      return asError(err, 'Could not create department.');
    }
  };

  const updateDiscussionGroup = async (groupId, updates) => {
    try {
      const res = await api.patch(`/discussion-groups/${groupId}`, updates);
      setDiscussionGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...res.data.group } : g)));
      return { success: true, group: res.data.group };
    } catch (err) {
      return asError(err, 'Could not update department.');
    }
  };

  const deleteDiscussionGroup = async (groupId) => {
    try {
      await api.delete(`/discussion-groups/${groupId}`);
      setDiscussionGroups((prev) => prev.filter((g) => g.id !== groupId));
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete department.');
    }
  };

  const getGroupMembers = async (groupId) => {
    try {
      const res = await api.get(`/discussion-groups/${groupId}/members`);
      return { success: true, members: res.data.members };
    } catch (err) {
      return asError(err, 'Could not load members.');
    }
  };

  const addGroupMember = async (groupId, userId) => {
    try {
      await api.post(`/discussion-groups/${groupId}/members`, { userId });
      await refreshDiscussionGroups();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not add member.');
    }
  };

  const removeGroupMember = async (groupId, userId) => {
    try {
      await api.delete(`/discussion-groups/${groupId}/members/${userId}`);
      await refreshDiscussionGroups();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not remove member.');
    }
  };

  // ===================
  // Availability Operations
  // ===================
  const updateAvailability = async (campId, userId, status) => {
    try {
      await api.post('/availability', { campId, status });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not update availability.');
    }
  };

  // ===================
  // AI Prescription Voice-to-Text (Gemini)
  // ===================
  // audioBlob: a Blob recorded via the browser's MediaRecorder API
  const transcribePrescription = async (audioBlob) => {
    try {
      const formData = new FormData();
      const extension = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
      formData.append('audio', audioBlob, `dictation.${extension}`);

      const res = await api.post('/prescriptions', formData, {
        headers: { 'Content-Type': undefined }, // let the browser set the multipart boundary
        timeout: 60000
      });

      setPrescriptions(prev => [res.data.prescription, ...prev]);
      return { success: true, prescription: res.data.prescription };
    } catch (err) {
      return asError(err, 'AI transcription failed. Please try again.');
    }
  };

  // ===================
  // Admin Custom Alert / Announcements
  // ===================
  const sendCustomAlert = async (title, message, targetRole, type) => {
    try {
      await api.post('/notifications', { title, message, targetRole, type });
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not send notification.');
    }
  };

  // Convenience wrapper used by the Announcements section on every dashboard.
  // targetRole: 'All' | 'Employee' | 'Intern' | 'Volunteer' | 'Membership' | 'Executive Director'
  const postAnnouncement = async (title, message, targetRole = 'All') => {
    return sendCustomAlert(title, message, targetRole, 'Announcement');
  };

  // ===================
  // Payments (gateway-agnostic — see backend/utils/paymentGateways/)
  // ===================
  // Kicks off a hosted-checkout session with whichever gateway the backend
  // is currently configured to use (PayFast by default, JazzCash as an
  // alternate): asks the backend to build a signed field set, then
  // auto-submits a hidden form so the browser navigates to the gateway's
  // own payment page. On completion the gateway redirects back to
  // /payment/result. Card data is entered on the gateway's page and never
  // touches this app.
  const payWithGateway = async (orgId, plan) => {
    try {
      const res = await api.post('/payments/initiate', { orgId, plan });
      const { postUrl, fields } = res.data;

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = postUrl;

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not start the payment gateway checkout.');
    }
  };

  const getPayments = async () => {
    try {
      const res = await api.get('/payments');
      return { success: true, payments: res.data.payments };
    } catch (err) {
      return asError(err, 'Could not fetch payment history.');
    }
  };

  // ===================
  // Billing dashboard (Super Admin overview + per-org audit history)
  // ===================
  const getBillingOverview = async (filters = {}) => {
    try {
      const res = await api.get('/billing/overview', { params: filters });
      return { success: true, organizations: res.data.organizations };
    } catch (err) {
      return asError(err, 'Could not fetch the billing overview.');
    }
  };

  const getOrgBillingHistory = async (orgId) => {
    try {
      const res = await api.get(`/billing/organizations/${orgId}/history`);
      return { success: true, events: res.data.events, payments: res.data.payments };
    } catch (err) {
      return asError(err, 'Could not fetch billing history.');
    }
  };

  // ===================
  // External User Queries (Home Page Query widget -> Super Admin inbox)
  // ===================
  // Public — no auth required, callable from an anonymous visitor on the
  // Home page.
  const submitQuery = async (payload) => {
    try {
      const res = await api.post('/queries', payload);
      return { success: true, query: res.data.query };
    } catch (err) {
      return asError(err, 'Could not submit your query. Please try again.');
    }
  };

  const updateQueryStatus = async (queryId, status) => {
    try {
      const res = await api.patch(`/queries/${queryId}/status`, { status });
      await refreshAll();
      return { success: true, query: res.data.query };
    } catch (err) {
      return asError(err, 'Could not update query status.');
    }
  };

  const respondToQuery = async (queryId, message) => {
    try {
      const res = await api.post(`/queries/${queryId}/respond`, { message });
      await refreshAll();
      return { success: true, query: res.data.query, warning: res.data.warning };
    } catch (err) {
      return asError(err, 'Could not send the response.');
    }
  };

  // ===================
  // Event/Camp Public Visibility Requests
  // ===================
  const requestVisibility = async (itemType, itemId) => {
    try {
      const res = await api.post('/visibility-requests', { itemType, itemId });
      await refreshAll();
      return { success: true, item: res.data.item };
    } catch (err) {
      return asError(err, 'Could not submit the visibility request.');
    }
  };

  const reviewVisibilityRequest = async (itemType, itemId, decision, reason) => {
    try {
      const res = await api.patch('/visibility-requests/review', { itemType, itemId, decision, reason });
      await refreshAll();
      return { success: true, item: res.data.item };
    } catch (err) {
      return asError(err, 'Could not review the visibility request.');
    }
  };

  // Public — no auth. Powers the Home Page "Events & Camps" section.
  const getPublicEventsAndCamps = async () => {
    try {
      const res = await api.get('/public/events-camps');
      return { success: true, items: res.data.items };
    } catch (err) {
      return asError(err, 'Could not load public events.');
    }
  };

  // ===================
  // Opportunity Management (Org Admin CRUD + public browse/apply)
  // ===================
  const createOpportunity = async (payload) => {
    try {
      const res = await api.post('/opportunities', payload);
      await refreshAll();
      return { success: true, opportunity: res.data.opportunity };
    } catch (err) {
      return asError(err, 'Could not create opportunity.');
    }
  };

  const updateOpportunity = async (id, payload) => {
    try {
      const res = await api.patch(`/opportunities/${id}`, payload);
      await refreshAll();
      return { success: true, opportunity: res.data.opportunity };
    } catch (err) {
      return asError(err, 'Could not update opportunity.');
    }
  };





  const deleteOpportunity = async (id) => {
    try {
      await api.delete(`/opportunities/${id}`);
      await refreshAll();
      return { success: true };
    } catch (err) {
      return asError(err, 'Could not delete opportunity.');
    }
  };

  const getOpportunityApplications = async (id) => {
    try {
      const res = await api.get(`/opportunities/${id}/applications`);
      return { success: true, applications: res.data.applications };
    } catch (err) {
      return asError(err, 'Could not load applications.');
    }
  };

  // Public — no auth. Home Page Opportunities browsing/apply.
  const getPublicOpportunities = async () => {
    try {
      const res = await api.get('/public/opportunities');
      return { success: true, opportunities: res.data.opportunities };
    } catch (err) {
      return asError(err, 'Could not load opportunities.');
    }
  };

  const getPublicOpportunityById = async (id) => {
    try {
      const res = await api.get(`/public/opportunities/${id}`);
      return { success: true, opportunity: res.data.opportunity };
    } catch (err) {
      return asError(err, 'Could not load opportunity.');
    }
  };


  const getMyProjectAssignments = async () => {
  try {
    const res = await api.get('/projects/my/assignments');

    return {
      success: true,
      projects: res.data.projects || []
    };
  } catch (err) {
    return asError(err, 'Could not load project assignments.');
  }
};

const updateProjectAssignmentStatus = async (projectId, status) => {
  try {
    const res = await api.patch(
      `/projects/${projectId}/assignment-status`,
      { status }
    );

    return {
      success: true,
      assignment: res.data.assignment
    };
  } catch (err) {
    return asError(err, 'Could not update project status.');
  }
};

  const applyToOpportunity = async (id, payload) => {
    try {
      const res = await api.post(`/public/opportunities/${id}/apply`, payload);
      return { success: true, application: res.data.application };
    } catch (err) {
      return asError(err, 'Could not submit your application.');
    }
  };

  return (
    <AppContext.Provider value={{
      organizations,
      users,
      camps,
      events,
      meetings,
      tasks,
      notifications,
      availability,
      prescriptions,
      discussionGroups,
      queries,
      visibilityRequests,
      opportunities,
      myPermissions,
      hasAccess,
      getAssignableSections,
      getUserPermissions,
      grantPermission,
      revokePermission,
      fetchAuditLogs,
      fetchPlatformSettings,
      updatePlatformSetting,
      projects,
      createProject,
      updateProject,
      deleteProject,
      getProjectTeam,
      addProjectTeamMember,
      removeProjectTeamMember,
      getMyProjectAssignments,
      updateProjectAssignmentStatus,
      campaigns,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      getCampaignTeam,
      addCampaignTeamMember,
      removeCampaignTeamMember,
      donors,
      createDonor,
      updateDonor,
      deleteDonor,
      donations,
      createDonation,
      deleteDonation,
      volunteers,
      updateVolunteerProfile,
      sponsors,
      sponsorships,
      createSponsor,
      updateSponsor,
      deleteSponsor,
      createSponsorship,
      updateSponsorship,
      deleteSponsorship,
      partners,
      createPartner,
      updatePartner,
      updatePartnerStatus,
      deletePartner,
      beneficiaries,
      enrollments,
      createBeneficiary,
      updateBeneficiary,
      deleteBeneficiary,
      createEnrollment,
      updateEnrollment,
      deleteEnrollment,
      expenses,
      createExpense,
      updateExpenseStatus,
      deleteExpense,
      documents,
      createDocument,
      updateDocumentStatus,
      deleteDocument,
      updateMyDirectoryProfile,
      setMyCancellationRequest,
      directory,
      fetchDirectory,
      connections,
      createConnectionRequest,
      respondToConnection,
      withdrawConnection,
      fetchConnectionMessages,
      sendConnectionMessage,
      currentUser,
      loading,
      login,
      logout,
      changePassword,
      forgotPassword,
      validateResetToken,
      resetPassword,
      registerOrganization,
      updateOrgStatus,
      deleteOrganization,
      registerStaff,
      createStaffByAdmin,
      updateStaffStatus,
      updateStaffRole,
      deleteStaff,
      assignMentor,
      createCamp,
      updateCamp,
      deleteCamp,
      createEvent,
      updateEvent,
      deleteEvent,
      createMeeting,
      updateMeeting,
      addMeetingSummary,
      deleteMeeting,
      getOrgAnalytics,
      getPlatformAnalytics,
      createTask,
      updateTaskStatus,
      getTaskComments,
      addTaskComment,
      markTaskCommentsRead,
      getGroupMessages,
      sendGroupMessage,
      markGroupRead,
      createDiscussionGroup,
      updateDiscussionGroup,
      deleteDiscussionGroup,
      getGroupMembers,
      addGroupMember,
      removeGroupMember,
      refreshDiscussionGroups,
      updateAvailability,
      transcribePrescription,
      sendCustomAlert,
      postAnnouncement,
      payWithGateway,
      getPayments,
      getBillingOverview,
      getOrgBillingHistory,
      submitQuery,
      updateQueryStatus,
      respondToQuery,
      requestVisibility,
      reviewVisibilityRequest,
      getPublicEventsAndCamps,
      setPublicEventsEnabled,
      createOpportunity,
      updateOpportunity,
      deleteOpportunity,
      getOpportunityApplications,
      getPublicOpportunities,
      getPublicOpportunityById,
      applyToOpportunity,
      refreshAll
    }}>
      {children}
    </AppContext.Provider>
  );
};
