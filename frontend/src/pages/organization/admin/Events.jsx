import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { CalendarDays, Plus, MapPin, Trash2, Pencil, Tag, CheckCircle2 } from 'lucide-react';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';

const EVENT_TYPES = ['General', 'Training', 'Fundraiser', 'Awareness', 'Outreach'];
const EVENT_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

const Events = () => {
  const { currentUser, events, createEvent, updateEvent, deleteEvent, hasAccess } = useContext(AppContext);
  const confirm = useConfirm();

  // Reachable by OrgAdmin always, or by a staff member granted the 'events'
  // Accessibility permission (see Accessibility.jsx). Anyone else is
  // redirected back to their own dashboard.
  if (currentUser.role !== 'OrgAdmin' && !hasAccess('events')) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('General');
  const [eventStatus, setEventStatus] = useState('Upcoming');

  // Filter by type
  const [typeFilter, setTypeFilter] = useState('All');

  // Events belonging to this organization
  const orgEvents = events.filter(e => e.orgId === currentUser.orgId);
  const visibleEvents = typeFilter === 'All' ? orgEvents : orgEvents.filter(e => e.eventType === typeFilter);

  // Quick analytics for this independent Events section
  const totalEvents = orgEvents.length;
  const upcomingCount = orgEvents.filter(e => e.status === 'Upcoming').length;
  const completedCount = orgEvents.filter(e => e.status === 'Completed').length;

  const openCreateModal = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventLocation('');
    setEventDate('');
    setEventDesc('');
    setEventType('General');
    setEventStatus('Upcoming');
    setModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventLocation(event.location);
    setEventDate(event.date);
    setEventDesc(event.description || '');
    setEventType(event.eventType || 'General');
    setEventStatus(event.status || 'Upcoming');
    setModalOpen(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle || !eventLocation || !eventDate) return;

    if (editingEventId) {
      await updateEvent(editingEventId, {
        title: eventTitle,
        location: eventLocation,
        date: eventDate,
        description: eventDesc,
        eventType,
        status: eventStatus
      });
    } else {
      await createEvent(eventTitle, eventLocation, eventDate, eventDesc, eventType);
    }

    setEditingEventId(null);
    setEventTitle('');
    setEventLocation('');
    setEventDate('');
    setEventDesc('');
    setEventType('General');
    setEventStatus('Upcoming');
    setModalOpen(false);
  };

  const handleDeleteEvent = async (event) => {
    const ok = await confirm({
      title: 'Delete this event?',
      message: `"${event.title}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    await deleteEvent(event.id);
  };

  // One-click shortcut to mark an event Completed without opening the modal
  const handleMarkComplete = async (event) => {
    await updateEvent(event.id, { status: 'Completed' });
  };

  return (
  <DashboardLayout>
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-black">
          Organization Events
        </h1>

        <p className="text-gray-600 mt-2">
          Plan trainings, fundraisers, awareness drives and community outreach
          events, separate from medical camp deployments.
        </p>
      </div>

      <button
        onClick={openCreateModal}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg transition"
      >
        <Plus size={18} />
        Create New Event
      </button>
    </div>

    {/* Event Analytics */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <p className="text-sm text-gray-500 font-semibold">Total Events</p>
        <p className="text-3xl font-bold text-black mt-1">{totalEvents}</p>
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

    {/* Type Filter */}
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {['All', ...EVENT_TYPES].map((type) => (
        <button
          key={type}
          onClick={() => setTypeFilter(type)}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            typeFilter === type
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {type}
        </button>
      ))}
    </div>

    {/* Event Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {visibleEvents.length > 0 ? (
        visibleEvents.map((event) => (
          <div
            key={event.id}
            className="bg-white border border-gray-200 rounded-xl shadow-md p-6"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-bold text-black">
                {event.title}
              </h3>

              <div className="flex items-center gap-1 shrink-0">
                {event.status === 'Upcoming' && (
                  <button
                    onClick={() => handleMarkComplete(event)}
                    title="Mark as completed"
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-green-600 transition"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(event)}
                  title="Edit event"
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDeleteEvent(event)}
                  title="Delete event"
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 text-gray-600">
              <MapPin size={14} />
              <span>{event.location}</span>
            </div>

            <div className="flex items-center gap-2 mt-4 text-gray-700 text-sm">
              <CalendarDays size={16} />
              <span>
                <strong>{event.date}</strong>
              </span>

              <span
                className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                  event.status === 'Upcoming'
                    ? 'bg-blue-100 text-blue-700'
                    : event.status === 'Completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {event.status}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 w-fit">
              <Tag size={12} />
              {event.eventType || 'General'}
            </div>

            <p className="text-gray-700 mt-4 min-h-[60px]">
              {event.description || 'No additional details provided.'}
            </p>
          </div>
        ))
      ) : (
        <div className="col-span-full bg-white border rounded-xl p-16 text-center shadow">
          <CalendarDays
            size={45}
            className="mx-auto text-gray-500 mb-4"
          />

          <h3 className="text-xl font-bold text-black">
            No Events Yet
          </h3>

          <p className="text-gray-600 mt-2">
            Click "Create New Event" to schedule your first organization event.
          </p>
        </div>
      )}
    </div>

    {/* Create / Edit Event Modal */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">
              {editingEventId ? 'Edit Event' : 'Create Organization Event'}
            </h2>

            <button
              onClick={() => setModalOpen(false)}
              className="text-gray-500 hover:text-red-600 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmitEvent} className="space-y-5">

            <div>
              <label className="block font-semibold text-black mb-2">
                Event Title
              </label>

              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Community Health Awareness Drive"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-black mb-2">
                Event Type
              </label>

              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {editingEventId && (
              <div>
                <label className="block font-semibold text-black mb-2">
                  Status
                </label>

                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVENT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-black mb-2">
                Event Location
              </label>

              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Community Hall, Karachi"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-black mb-2">
                Date of Event
              </label>

              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-black mb-2">
                Description
              </label>

              <textarea
                rows={4}
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                placeholder="Agenda, target audience, partners involved..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              📢 <strong>Heads up:</strong> Saving this event will broadcast an
              announcement notification to all registered staff.
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
                {editingEventId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>

          </form>
        </div>
      </div>
    )}

  </DashboardLayout>
);
};

export default Events;
