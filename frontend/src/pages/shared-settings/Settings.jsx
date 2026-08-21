import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react';

const Settings = () => {
  const { currentUser, changePassword } = useContext(AppContext);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    const res = await changePassword(formData.currentPassword, formData.newPassword);
    setSubmitting(false);

    if (res.success) {
      setSuccess('Password updated successfully.');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setError(res.error || 'Could not update password.');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account and security preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-fit">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <UserCircle2 size={28} />
            </div>
            <div>
              <p className="font-bold text-black">{currentUser?.fullName}</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Role</span>
              <span className="font-semibold text-black">{currentUser?.role}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-gray-500">Status</span>
              <span className="font-semibold text-green-600">{currentUser?.status}</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-1">
            <KeyRound size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-black">Change Password</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Choose a strong password you don't use anywhere else.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-5">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-400 text-green-700 rounded-lg p-3 text-sm mb-5 flex items-center gap-2">
              <ShieldCheck size={16} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="max-w-md">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-black mb-2">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-black mb-2">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <KeyRound size={18} />
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
