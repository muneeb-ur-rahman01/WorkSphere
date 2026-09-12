import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Globe, Search, Send, ExternalLink, X } from 'lucide-react';

const OrganizationDirectory = () => {
  const { directory, fetchDirectory, createConnectionRequest, connections } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [requestModalOrg, setRequestModalOrg] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const load = async (search) => {
    setLoading(true);
    await fetchDirectory(search ? { search } : {});
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    load(searchTerm);
  };

  const existingConnectionWith = (orgId) => connections.find((c) =>
    (c.requesterOrgId === orgId || c.targetOrgId === orgId) && ['Pending', 'Accepted'].includes(c.status)
  );

  const openRequestModal = (org) => { setRequestModalOrg(org); setMessage(''); setError(''); setSent(false); };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await createConnectionRequest(requestModalOrg.id, message);
    setSubmitting(false);
    if (res.success) setSent(true);
    else setError(res.error);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <Globe size={26} className="text-indigo-600" /> Organization Directory
        </h1>
        <p className="text-gray-600 mt-1">
          Browse other organizations on the platform and reach out. Only public profile information is
          shown — your private data (staff, projects, finances) stays isolated regardless of any connection.
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex items-center gap-3">
        <Search size={20} className="text-gray-500" />
        <input type="text" placeholder="Search by name or mission..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition text-sm whitespace-nowrap">Search</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading && <div className="col-span-full text-center text-gray-400 py-10">Loading directory...</div>}
        {!loading && directory.length === 0 && (
          <div className="col-span-full bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400">
            No organizations found.
          </div>
        )}
        {!loading && directory.map((org) => {
          const existing = existingConnectionWith(org.id);
          return (
            <div key={org.id} className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 flex flex-col gap-2">
              <h3 className="font-bold text-black">{org.name}</h3>
              {org.focusArea && <span className="w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{org.focusArea}</span>}
              {org.city && <p className="text-xs text-gray-500">{org.city}</p>}
              {org.missionStatement && <p className="text-sm text-gray-600 line-clamp-3 mt-1">{org.missionStatement}</p>}
              {org.website && (
                <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                  <ExternalLink size={12} /> Website
                </a>
              )}
              <div className="pt-3 mt-1 border-t border-gray-100">
                {existing ? (
                  <span className="text-xs font-semibold text-gray-500">
                    {existing.status === 'Pending' ? 'Connection request pending' : 'Already connected'}
                  </span>
                ) : (
                  <button onClick={() => openRequestModal(org)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition">
                    <Send size={13} /> Send Connection Request
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {requestModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Connect with {requestModalOrg.name}</h2>
              <button onClick={() => setRequestModalOrg(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            {sent ? (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                Request sent. You'll be able to message once they accept — track it under Connections.
              </p>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm">{error}</div>}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">Message (optional)</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Introduce your organization and why you'd like to connect..." className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setRequestModalOrg(null)} className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                  <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
                    {submitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrganizationDirectory;
