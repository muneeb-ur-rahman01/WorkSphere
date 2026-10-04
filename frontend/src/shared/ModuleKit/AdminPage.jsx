import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';

// Shared shell for OrgAdmin-only pages: login + role guard (the server enforces it again).
const AdminPage = ({ children }) => {
  const { currentUser } = useContext(AppContext);
  if (!currentUser) return <Navigate to="/login/org" replace />;
  if (currentUser.role !== 'OrgAdmin') return <Navigate to="/staff/dashboard" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default AdminPage;
