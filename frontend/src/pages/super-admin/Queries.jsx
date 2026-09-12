import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../shared/Modal/Modal';
import Input from '../../shared/Input/Input';
import Button from '../../shared/Button/Button';
import { Search, Mail, MessageSquareText, Send, CheckCircle2 } from 'lucide-react';

const STATUS_FILTERS = ['All', 'New', 'In Progress', 'Resolved'];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-700';
    case 'In Progress': return 'bg-amber-100 text-amber-700';
    case 'Resolved': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const Queries = () => {
  const { queries, updateQueryStatus, respondToQuery } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeQuery, setActiveQuery] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const filtered = useMemo(() => {
    return queries
      .filter((q) => statusFilter === 'All' || q.status === statusFilter)
      .filter((q) =>
        q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [queries, statusFilter, searchTerm]);

  const newCount = queries.filter((q) => q.status === 'New').length;

  const openQuery = (q) => {
    setActiveQuery(q);
    setResponseText(q.responseText || '');
    setSendError('');
    setSendSuccess(false);
    // Viewing a New query is a natural moment to mark it as being looked at.
    if (q.status === 'New') updateQueryStatus(q.id, 'In Progress');
  };

  const closeModal = () => {
    setActiveQuery(null);
    setResponseText('');
    setSendError('');
    setSendSuccess(false);
  };

  const handleStatusChange = async (queryId, status) => {
    await updateQueryStatus(queryId, status);
    if (activeQuery?.id === queryId) setActiveQuery((q) => ({ ...q, status }));
  };

  const handleSendResponse = async () => {
    if (!responseText.trim()) {
      setSendError('Please write a response before sending.');
      return;
    }
    setSending(true);
    setSendError('');
    const res = await respondToQuery(activeQuery.id, responseText);
    setSending(false);
    if (res.success) {
      setSendSuccess(true);
      if (res.warning) setSendError(res.warning);
    } else {
      setSendError(res.error || 'Could not send the response.');
    }
  };

  return (
    <DashboardLayout>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">External Queries</h1>
          <p className="text-gray-600 mt-1">
            Messages submitted through the public website's Query widget.
            {newCount > 0 && <span className="ml-2 text-blue-600 font-semibold">{newCount} new</span>}
          </p>
        </div>
      </div>

      {/* Search + Filter Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1">
          <Search size={20} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white text-black placeholder-gray-400 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Queries Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Inbox</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-gray-700">From</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Subject</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Submitted</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No queries match these filters.
                  </td>
                </tr>
              )}
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-black">{q.name}</p>
                    <p className="text-gray-500 text-xs">{q.email}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-gray-700">{q.subject}</td>
                  <td className="px-6 py-4 text-gray-600 text-xs">{formatDateTime(q.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openQuery(q)}
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <MessageSquareText size={16} /> View & Respond
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View / Respond Modal */}
      <Modal isOpen={Boolean(activeQuery)} onClose={closeModal} title="Query Details" maxWidth="560px">
        {activeQuery && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-black">{activeQuery.subject}</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadgeClass(activeQuery.status)}`}>
                  {activeQuery.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <Mail size={14} /> {activeQuery.name} &lt;{activeQuery.email}&gt;
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(activeQuery.createdAt)}</p>
              <p className="text-sm text-gray-800 mt-3 whitespace-pre-wrap leading-6">{activeQuery.message}</p>
            </div>

            {activeQuery.responseText && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs font-bold text-indigo-700 mb-1">Previous response sent</p>
                <p className="text-sm text-indigo-900 whitespace-pre-wrap leading-6">{activeQuery.responseText}</p>
                <p className="text-xs text-indigo-500 mt-1">{formatDateTime(activeQuery.respondedAt)}</p>
              </div>
            )}

            <div className="flex gap-2">
              {STATUS_FILTERS.filter((s) => s !== 'All').map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(activeQuery.id, s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                    activeQuery.status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Mark {s}
                </button>
              ))}
            </div>

            <div>
              <Input
                label="Reply by email"
                type="textarea"
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={`Write a reply to ${activeQuery.name}...`}
              />
              {sendError && <p className="text-xs text-red-600 mt-1">{sendError}</p>}
              {sendSuccess && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Reply sent and query marked Resolved.
                </p>
              )}
              <Button
                onClick={handleSendResponse}
                disabled={sending}
                fullWidth
                className="mt-3 flex items-center justify-center gap-2"
              >
                {sending ? 'Sending…' : (<><Send size={16} /> Send Reply</>)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </DashboardLayout>
  );
};

export default Queries;
