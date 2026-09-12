import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Link2, Check, Ban, X, Send, MessageSquare } from 'lucide-react';

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Accepted': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Declined': return 'bg-red-100 text-red-700';
    case 'Withdrawn': return 'bg-gray-200 text-gray-600';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const Connections = () => {
  const { connections, currentUser, respondToConnection, withdrawConnection, fetchConnectionMessages, sendConnectionMessage } = useContext(AppContext);
  const confirm = useConfirm();

  const [messageModalConnection, setMessageModalConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  const incoming = connections.filter((c) => c.targetOrgId === currentUser.orgId && c.status === 'Pending');
  const active = connections.filter((c) => c.status === 'Accepted');
  const other = connections.filter((c) => !incoming.includes(c) && !active.includes(c));

  const otherOrgName = (c) => (c.requesterOrgId === currentUser.orgId ? c.targetOrgName : c.requesterOrgName);

  const handleAccept = (c) => respondToConnection(c.id, 'Accepted');
  const handleDecline = async (c) => {
    const ok = await confirm({ title: 'Decline this request?', confirmLabel: 'Decline', variant: 'warning' });
    if (ok) respondToConnection(c.id, 'Declined');
  };
  const handleWithdraw = async (c) => {
    const ok = await confirm({ title: 'Withdraw this request?', confirmLabel: 'Withdraw', variant: 'warning' });
    if (ok) withdrawConnection(c.id);
  };

  const openMessages = async (c) => {
    setMessageModalConnection(c);
    setMessageText('');
    setLoadingMessages(true);
    const res = await fetchConnectionMessages(c.id);
    setLoadingMessages(false);
    if (res.success) setMessages(res.messages);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const res = await sendConnectionMessage(messageModalConnection.id, messageText);
    if (res.success) {
      setMessages((prev) => [...prev, res.message]);
      setMessageText('');
    }
  };

  // Keep the open thread current if connections list refreshes underneath it.
  useEffect(() => {
    if (messageModalConnection) {
      const stillThere = connections.find((c) => c.id === messageModalConnection.id);
      if (!stillThere) setMessageModalConnection(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  const ConnectionRow = ({ c }) => (
    <div className="px-6 py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-black">{otherOrgName(c)}</p>
        {c.initialMessage && <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">"{c.initialMessage}"</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(c.status)}`}>{c.status}</span>
        {c.status === 'Accepted' && (
          <button onClick={() => openMessages(c)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition">
            <MessageSquare size={13} /> Messages
          </button>
        )}
        {c.targetOrgId === currentUser.orgId && c.status === 'Pending' && (
          <>
            <button onClick={() => handleAccept(c)} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition">
              <Check size={13} /> Accept
            </button>
            <button onClick={() => handleDecline(c)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
              <Ban size={13} /> Decline
            </button>
          </>
        )}
        {c.requesterOrgId === currentUser.orgId && c.status === 'Pending' && (
          <button onClick={() => handleWithdraw(c)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
            Withdraw
          </button>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <Link2 size={26} className="text-indigo-600" /> Connections
        </h1>
        <p className="text-gray-600 mt-1">Connection requests to and from other organizations on the platform.</p>
      </div>

      {incoming.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-black">Incoming Requests</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {incoming.map((c) => <ConnectionRow key={c.id} c={c} />)}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-black">Active Connections</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {active.length === 0 && <div className="px-6 py-6 text-center text-gray-400 text-sm">No active connections yet.</div>}
          {active.map((c) => <ConnectionRow key={c.id} c={c} />)}
        </div>
      </div>

      {other.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-black">History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {other.map((c) => <ConnectionRow key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {messageModalConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-black">{otherOrgName(messageModalConnection)}</h2>
              <button onClick={() => setMessageModalConnection(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMessages && <p className="text-sm text-gray-400 text-center">Loading messages...</p>}
              {!loadingMessages && messages.length === 0 && <p className="text-sm text-gray-400 text-center">No messages yet — say hello.</p>}
              {messages.map((m) => {
                const mine = m.senderOrgId === currentUser.orgId;
                return (
                  <div key={m.id} className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'ml-auto bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {m.message}
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSend} className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"><Send size={16} /></button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Connections;
