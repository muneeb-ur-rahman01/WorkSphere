import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Card from '../../../shared/Card/Card';
import Button from '../../../shared/Button/Button';
import Input from '../../../shared/Input/Input';
import Table from '../../../shared/Table/Table';
import Modal from '../../../shared/Modal/Modal';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Calendar, Plus, MapPin, UserCheck, HelpCircle, UserX, Trash2, Pencil, CheckCircle2 } from 'lucide-react';

const CAMP_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

const Camps = () => {
  const { currentUser, camps, createCamp, updateCamp, deleteCamp, availability, users, hasAccess } = useContext(AppContext);
  const confirm = useConfirm();

  // Reachable by OrgAdmin always, or by a staff member granted the 'camps'
  // Accessibility permission (see Accessibility.jsx). Anyone else is
  // redirected back to their own dashboard.
  if (currentUser.role !== 'OrgAdmin' && !hasAccess('camps')) {
    return <Navigate to="/staff/dashboard" replace />;
  }
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampId, setEditingCampId] = useState(null);
  const [campTitle, setCampTitle] = useState('');
  const [campLocation, setCampLocation] = useState('');
  const [campDate, setCampDate] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campStatus, setCampStatus] = useState('Upcoming');

  // Selected camp availability details
  const [activeCampForAvailability, setActiveCampForAvailability] = useState(null);
  const [availModalOpen, setAvailModalOpen] = useState(false);

  // Filter camps belonging to this organization
  const orgCamps = camps.filter(c => c.orgId === currentUser.orgId);

  // Quick analytics for this independent Camps section
  const totalCamps = orgCamps.length;
  const upcomingCount = orgCamps.filter(c => c.status === 'Upcoming').length;
  const completedCount = orgCamps.filter(c => c.status === 'Completed').length;

  const openCreateModal = () => {
    setEditingCampId(null);
    setCampTitle('');
    setCampLocation('');
    setCampDate('');
    setCampDesc('');
    setCampStatus('Upcoming');
    setModalOpen(true);
  };

  const openEditModal = (camp) => {
    setEditingCampId(camp.id);
    setCampTitle(camp.title);
    setCampLocation(camp.location);
    setCampDate(camp.date);
    setCampDesc(camp.description || '');
    setCampStatus(camp.status || 'Upcoming');
    setModalOpen(true);
  };

  const handleSubmitCamp = async (e) => {
    e.preventDefault();
    if (!campTitle || !campLocation || !campDate) return;

    if (editingCampId) {
      await updateCamp(editingCampId, { title: campTitle, location: campLocation, date: campDate, description: campDesc, status: campStatus });
    } else {
      await createCamp(campTitle, campLocation, campDate, campDesc);
    }

    // Reset and close
    setEditingCampId(null);
    setCampTitle('');
    setCampLocation('');
    setCampDate('');
    setCampDesc('');
    setCampStatus('Upcoming');
    setModalOpen(false);
  };

  const handleDeleteCamp = async (camp) => {
    const ok = await confirm({
      title: 'Delete this camp?',
      message: `"${camp.title}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    await deleteCamp(camp.id);
  };

  // One-click shortcut to mark a camp Completed without opening the modal
  const handleMarkComplete = async (camp) => {
    await updateCamp(camp.id, { status: 'Completed' });
  };

  const handleViewAvailability = (camp) => {
    setActiveCampForAvailability(camp);
    setAvailModalOpen(true);
  };

  // Get availability stats for a specific camp
  const getAvailabilityStats = (campId) => {
    const campAvails = availability.filter(a => a.campId === campId);
    const available = campAvails.filter(a => a.status === 'Available').length;
    const maybe = campAvails.filter(a => a.status === 'Maybe').length;
    const notAvailable = campAvails.filter(a => a.status === 'NotAvailable').length;
    return { available, maybe, notAvailable };
  };

  // Get list of personnel with their availability status for the active camp
  const getCampAvailabilityList = () => {
    if (!activeCampForAvailability) return [];
    
    // Get all active staff of this organization
    const orgStaff = users.filter(u => u.orgId === currentUser.orgId && u.status === 'Active' && u.role !== 'OrgAdmin');
    
    return orgStaff.map(staff => {
      const record = availability.find(a => a.campId === activeCampForAvailability.id && a.userId === staff.id);
      return {
        id: staff.id,
        fullName: staff.fullName,
        role: staff.role,
        status: record ? record.status : 'Pending Response'
      };
    });
  };

  const campAvailsList = getCampAvailabilityList();

  return (
  <DashboardLayout>
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-black">
          Medical Camps & Deployments
        </h1>

        <p className="text-gray-600 mt-2">
          Schedule new camp locations, inspect upcoming sites, and monitor
          staff availability rosters.
        </p>
      </div>

      <button
        onClick={openCreateModal}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg transition"
      >
        <Plus size={18} />
        Schedule New Camp
      </button>
    </div>

    {/* Camp Analytics */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <p className="text-sm text-gray-500 font-semibold">Total Camps</p>
        <p className="text-3xl font-bold text-black mt-1">{totalCamps}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <p className="text-sm text-gray-500 font-semibold">Upcoming</p>
        <p className="text-3xl font-bold text-blue-600 mt-1">{upcomingCount}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <p className="text-sm text-gray-500 font-semibold">Completed</p>
        <p className="text-3xl font-bold text-green-600 mt-1">{completedCount}</p>
      </div>
    </div>

    {/* Camp Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {orgCamps.length > 0 ? (
        orgCamps.map((camp) => {
          const { available, maybe, notAvailable } =
            getAvailabilityStats(camp.id);

          return (
            <div
              key={camp.id}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-bold text-black">
                  {camp.title}
                </h3>

                <div className="flex items-center gap-1 shrink-0">
                  {camp.status === 'Upcoming' && (
                    <button
                      onClick={() => handleMarkComplete(camp)}
                      title="Mark as completed"
                      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-green-600 transition"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(camp)}
                    title="Edit camp"
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCamp(camp)}
                    title="Delete camp"
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mt-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                {camp.location}
              </p>

              <div className="flex items-center gap-2 mt-4 text-gray-700 text-sm">
                <Calendar size={16} />
                <span>
                  <strong>{camp.date}</strong>
                </span>

                <span
                  className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                    camp.status === "Upcoming"
                      ? "bg-blue-100 text-blue-700"
                      : camp.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {camp.status}
                </span>
              </div>

              <p className="text-gray-700 mt-5 min-h-[70px]">
                {camp.description ||
                  "No detailed instructions provided."}
              </p>

              <div className="bg-gray-100 border rounded-lg p-4 mt-5">
                <p className="text-sm font-bold text-gray-800 mb-3">
                  Roster Availability Summary
                </p>

                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-green-600">
                    🟢 Available: {available}
                  </span>

                  <span className="text-yellow-600">
                    🟡 Maybe: {maybe}
                  </span>

                  <span className="text-red-600">
                    🔴 Not Available: {notAvailable}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleViewAvailability(camp)}
                className="w-full mt-6 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-3 rounded-lg transition"
              >
                Inspect Personnel Availability
              </button>
            </div>
          );
        })
      ) : (
        <div className="col-span-full bg-white border rounded-xl p-16 text-center shadow">
          <Calendar
            size={45}
            className="mx-auto text-gray-500 mb-4"
          />

          <h3 className="text-xl font-bold text-black">
            No Camps Scheduled Yet
          </h3>

          <p className="text-gray-600 mt-2">
            Click "Schedule New Camp" to launch your first camp.
          </p>
        </div>
      )}
    </div>    {/* Create Camp Modal */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">
              {editingCampId ? 'Edit Medical Deployment Camp' : 'Schedule Medical Deployment Camp'}
            </h2>

            <button
              onClick={() => setModalOpen(false)}
              className="text-gray-500 hover:text-red-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmitCamp} className="space-y-5">

            <div>
              <label className="block font-semibold text-black mb-2">
                Camp / Deployment Title
              </label>

              <input
                type="text"
                value={campTitle}
                onChange={(e) => setCampTitle(e.target.value)}
                placeholder="Flood Relief General Medicine Clinic"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-black mb-2">
                Deployment Location
              </label>

              <input
                type="text"
                value={campLocation}
                onChange={(e) => setCampLocation(e.target.value)}
                placeholder="Swat Valley Relief Camps"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-black mb-2">
                Date of Camp
              </label>

              <input
                type="date"
                value={campDate}
                onChange={(e) => setCampDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-black mb-2">
                Description / Scope of Service
              </label>

              <textarea
                rows={4}
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
                placeholder="Specify medication, target demographic etc..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {editingCampId && (
              <div>
                <label className="block font-semibold text-black mb-2">
                  Status
                </label>

                <select
                  value={campStatus}
                  onChange={(e) => setCampStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CAMP_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              📢 <strong>Availability Trigger:</strong> Saving this camp will
              automatically broadcast an availability request to all registered
              staff (Employees, Interns, Volunteers, Members & Executive Directors).
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-lg border border-gray-300 bg-gray-100 text-black font-bold hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {editingCampId ? 'Save Changes' : 'Create & Broadcast Alert'}
              </button>
            </div>

          </form>
        </div>
      </div>
    )}
        {/* Availability Modal */}
    {availModalOpen && activeCampForAvailability && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">
                Roster Status: {activeCampForAvailability.title}
              </h2>

              <div className="flex items-center gap-2 text-gray-600 mt-2">
                <MapPin size={16} />
                <span>{activeCampForAvailability.location}</span>
              </div>
            </div>

            <button
              onClick={() => setAvailModalOpen(false)}
              className="text-gray-500 hover:text-red-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          {campAvailsList.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">

              <table className="min-w-full bg-white">

                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-black">
                      Personnel
                    </th>

                    <th className="px-5 py-3 text-left font-bold text-black">
                      Role
                    </th>

                    <th className="px-5 py-3 text-left font-bold text-black">
                      Availability
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {campAvailsList.map((staff) => {
                    let badge =
                      "bg-gray-100 text-gray-700";
                    let icon = <HelpCircle size={16} />;

                    if (staff.status === "Available") {
                      badge = "bg-green-100 text-green-700";
                      icon = <UserCheck size={16} />;
                    }

                    if (staff.status === "Maybe") {
                      badge = "bg-yellow-100 text-yellow-700";
                      icon = <HelpCircle size={16} />;
                    }

                    if (staff.status === "NotAvailable") {
                      badge = "bg-red-100 text-red-700";
                      icon = <UserX size={16} />;
                    }

                    return (
                      <tr
                        key={staff.id}
                        className="border-t border-gray-200"
                      >
                        <td className="px-5 py-4 font-semibold text-black">
                          {staff.fullName}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {staff.role}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold ${badge}`}
                          >
                            {icon}
                            {staff.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>

            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">
              No personnel registered to this NGO yet.
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setAvailModalOpen(false)}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              Close Roster
            </button>
          </div>

        </div>
      </div>
    )}

  </DashboardLayout>
);
};

export default Camps;

