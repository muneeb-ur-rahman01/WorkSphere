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
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [discussionGroups, setDiscussionGroups] = useState([]);
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
        api.get('/tasks').then(r => setTasks(r.data.tasks)).catch(() => {}),
        api.get('/notifications').then(r => setNotifications(r.data.notifications)).catch(() => {}),
        api.get('/availability').then(r => setAvailability(r.data.availability)).catch(() => {}),
        api.get('/prescriptions').then(r => setPrescriptions(r.data.prescriptions)).catch(() => {}),
        api.get('/discussion-groups').then(r => setDiscussionGroups(r.data.groups)).catch(() => {}),
        api.get('/permissions/me').then(r => setMyPermissions(r.data.sections)).catch(() => {})
      ];
      if (currentUser.role === 'SuperAdmin') {
        requests.push(api.get('/organizations').then(r => setOrganizations(r.data.organizations)).catch(() => {}));
      } else {
        requests.push(
          api.get('/organizations/me')
            .then(r => setOrganizations(r.data.organization ? [r.data.organization] : []))
            .catch(() => {})
        );
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
      return { success: true, orgId: res.data.orgId, paymentDueAt: res.data.paymentDueAt, amountDue: res.data.amountDue };
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
  const createCamp = async (title, location, date, description) => {
    try {
      const res = await api.post('/camps', { title, location, date, description });
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
  const createEvent = async (title, location, date, description, eventType) => {
    try {
      const res = await api.post('/events', { title, location, date, description, eventType });
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

  return (
    <AppContext.Provider value={{
      organizations,
      users,
      camps,
      events,
      tasks,
      notifications,
      availability,
      prescriptions,
      discussionGroups,
      myPermissions,
      hasAccess,
      getAssignableSections,
      getUserPermissions,
      grantPermission,
      revokePermission,
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
      refreshAll
    }}>
      {children}
    </AppContext.Provider>
  );
};
