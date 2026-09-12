import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Globe, Clock, CheckCircle2, XCircle, Calendar, CalendarDays, MapPin } from 'lucide-react';

const statusMeta = {
  Pending: { icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Pending Review' },
  Approved: { icon: CheckCircle2, color: 'text-green-700 bg-green-50 border-green-200', label: 'Approved — Live' },
  Rejected: { icon: XCircle, color: 'text-red-700 bg-red-50 border-red-200', label: 'Rejected' }
};

// Org Admin's "Request Event/Camp Visibility" section — item 5 of the
// platform update. Requesting itself happens inline on the Camps/Events
// cards (fewer clicks, keeps the item's context visible); this page is
// the dedicated place to track the status of every request that's been
// made, matching the spec's explicit "Request Event/Camp Visibility"
// section requirement.
const VisibilityRequests = () => {
  const { currentUser, camps, events, visibilityRequests } = useContext(AppContext);

  const orgCamps = camps.filter((c) => c.orgId === currentUser.orgId);
  const orgEvents = events.filter((e) => e.orgId === currentUser.orgId);

  const eligible = useMemo(() => {
    return [
      ...orgCamps.filter((c) => !c.visibilityStatus || c.visibilityStatus === 'None').map((c) => ({ ...c, itemType: 'camp' })),
      ...orgEvents.filter((e) => !e.visibilityStatus || e.visibilityStatus === 'None').map((e) => ({ ...e, itemType: 'event' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [orgCamps, orgEvents]);

  const sortedRequests = [...visibilityRequests].sort(
    (a, b) => new Date(b.visibilityRequestedAt || 0) - new Date(a.visibilityRequestedAt || 0)
  );

  return (
    <DashboardLayout>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <Globe size={26} className="text-indigo-600" /> Event/Camp Visibility
        </h1>
        <p className="text-gray-600 mt-1">
          Track requests to feature your camps and events on the public CampOS Home Page.
          Submit a new request directly from a camp or event's card in{' '}
          <span className="font-semibold">Camps</span> or <span className="font-semibold">Events</span>.
        </p>
      </div>

      {/* Requested / reviewed history */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-black">Your Requests</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {sortedRequests.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400">
              No visibility requests yet. Go to Camps or Events and click "Request Public Visibility" on an item.
            </div>
          )}
          {sortedRequests.map((item) => {
            const meta = statusMeta[item.visibilityStatus] || statusMeta.Pending;
            const Icon = meta.icon;
            return (
              <div key={`${item.itemType}-${item.id}`} className="px-6 py-4 flex items-center gap-4">
                <div className={`shrink-0 rounded-lg p-2 border ${meta.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black flex items-center gap-2">
                    {item.title}
                    <span className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                      {item.itemType}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>
                  </p>
                  {item.visibilityStatus === 'Rejected' && item.visibilityRejectionReason && (
                    <p className="text-xs text-red-600 mt-1">Reason: {item.visibilityRejectionReason}</p>
                  )}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligible items with no request yet — quick nudge */}
      {eligible.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
          <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
            <CalendarDays size={18} /> Not requested yet
          </h3>
          <p className="text-sm text-indigo-700 mb-3">
            These camps/events haven't had a visibility request submitted. Open them in Camps or Events to request visibility.
          </p>
          <ul className="text-sm text-indigo-900 space-y-1">
            {eligible.slice(0, 6).map((item) => (
              <li key={`${item.itemType}-${item.id}`} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {item.title} <span className="text-indigo-400 text-xs">({item.date})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </DashboardLayout>
  );
};

export default VisibilityRequests;
