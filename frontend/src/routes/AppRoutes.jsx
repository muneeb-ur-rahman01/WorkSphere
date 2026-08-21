import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

// Public site pages
import Home from '../pages/public-site/Home';
import About from '../pages/public-site/About';
import RegisterOrganization from '../pages/public-site/RegisterOrganization';
import LoginChoice from '../pages/public-site/LoginChoice';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Super Admin pages
import SuperAdminDashboard from '../pages/super-admin/SuperAdminDashboard';
import Organizations from '../pages/super-admin/Organizations';
import SuperAdminAnalytics from '../pages/super-admin/Analytics';
import BillingDashboard from '../pages/super-admin/BillingDashboard';

// NGO Admin pages
import AdminDashboard from '../pages/organization/admin/AdminDashboard';
import PendingRequests from '../pages/organization/admin/PendingRequests';
import OrgUsers from '../pages/organization/admin/OrgUsers';
import Camps from '../pages/organization/admin/Camps';
import Events from '../pages/organization/admin/Events';
import Tasks from '../pages/organization/admin/Tasks';
import OrgAnalytics from '../pages/organization/admin/Analytics';
import Billing from '../pages/organization/admin/Billing';
import Accessibility from '../pages/organization/admin/Accessibility';

// Staff pages
import StaffDashboard from '../pages/organization/staff/StaffDashboard';

// Discussion (shared: OrgAdmin + all staff-tier roles)
import Discussion from '../pages/organization/discussion/Discussion';

// Shared pages
import Settings from '../pages/shared-settings/Settings';

// Payment pages
import PaymentResult from '../pages/payment/PaymentResult';

import { STAFF_ROLE_NAMES } from '../Config/constant';

// Route Guards (Simulated redirects based on localStorage sessions)
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useContext(AppContext);

  if (!currentUser) {
    return <Navigate to="/login-choice" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // Redirect unauthorized roles back to their respective dashboards
    if (currentUser.role === 'SuperAdmin') return <Navigate to="/super-admin/dashboard" replace />;
    if (currentUser.role === 'OrgAdmin') return <Navigate to="/org-admin/dashboard" replace />;
    return <Navigate to="/staff/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Site Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/register-org" element={<RegisterOrganization />} />
        <Route path="/login-choice" element={<LoginChoice />} />
        <Route path="/payment/result" element={<PaymentResult />} />
        
        {/* Authentication Routes */}
        <Route path="/login/:type" element={<Login />} />
        <Route path="/register-staff" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Super Admin Routes */}
        <Route path="/super-admin/dashboard" element={
          <PrivateRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/super-admin/organizations" element={
          <PrivateRoute allowedRoles={['SuperAdmin']}>
            <Organizations />
          </PrivateRoute>
        } />
        <Route path="/super-admin/billing" element={
          <PrivateRoute allowedRoles={['SuperAdmin']}>
            <BillingDashboard />
          </PrivateRoute>
        } />
        <Route path="/super-admin/analytics" element={
          <PrivateRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminAnalytics />
          </PrivateRoute>
        } />

        {/* NGO Admin Routes */}
        <Route path="/org-admin/dashboard" element={
          <PrivateRoute allowedRoles={['OrgAdmin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        {/* Also reachable by staff-tier roles that were granted the
            'registration_requests' Accessibility permission — the page
            itself redirects away anyone without OrgAdmin or that grant. */}
        <Route path="/org-admin/requests" element={
          <PrivateRoute allowedRoles={['OrgAdmin', ...STAFF_ROLE_NAMES]}>
            <PendingRequests />
          </PrivateRoute>
        } />
        <Route path="/org-admin/accessibility" element={
          <PrivateRoute allowedRoles={['OrgAdmin']}>
            <Accessibility />
          </PrivateRoute>
        } />
        <Route path="/org-admin/users" element={
          <PrivateRoute allowedRoles={['OrgAdmin']}>
            <OrgUsers />
          </PrivateRoute>
        } />
        {/* Also reachable by staff-tier roles granted the 'camps' /
            'events' Accessibility permission — each page redirects away
            anyone without OrgAdmin or that specific grant. */}
        <Route path="/org-admin/camps" element={
          <PrivateRoute allowedRoles={['OrgAdmin', ...STAFF_ROLE_NAMES]}>
            <Camps />
          </PrivateRoute>
        } />
        <Route path="/org-admin/events" element={
          <PrivateRoute allowedRoles={['OrgAdmin', ...STAFF_ROLE_NAMES]}>
            <Events />
          </PrivateRoute>
        } />
        <Route path="/org-admin/tasks" element={
          <PrivateRoute allowedRoles={['OrgAdmin']}>
            <Tasks />
          </PrivateRoute>
        } />
        <Route path="/org-admin/billing" element={
          <PrivateRoute allowedRoles={['OrgAdmin']}>
            <Billing />
          </PrivateRoute>
        } />
        <Route path="/org-admin/analytics" element={
          <PrivateRoute allowedRoles={['OrgAdmin']}>
            <OrgAnalytics />
          </PrivateRoute>
        } />

        {/* Staff Dashboard (Employee, Intern, Volunteer, Membership, Executive Director) */}
        <Route path="/staff/dashboard" element={
          <PrivateRoute allowedRoles={STAFF_ROLE_NAMES}>
            <StaffDashboard />
          </PrivateRoute>
        } />

        {/* Discussion / Group Chat (OrgAdmin + all staff-tier roles) */}
        <Route path="/discussion" element={
          <PrivateRoute allowedRoles={['OrgAdmin', ...STAFF_ROLE_NAMES]}>
            <Discussion />
          </PrivateRoute>
        } />

        {/* Settings (all authenticated roles) */}
        <Route path="/settings" element={
          <PrivateRoute allowedRoles={['SuperAdmin', 'OrgAdmin', ...STAFF_ROLE_NAMES]}>
            <Settings />
          </PrivateRoute>
        } />

        {/* Fallback Catch-All Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
