import React, { useContext, useEffect, useRef, useState } from 'react';
import { X, Send, MessageCircle, Loader2, Calendar, Flag } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { getRoleBadgeColor } from '../../Config/constant';

// Reusable "open task -> discussion thread" modal, shared by the Org Admin
// Task Delegation Matrix and the Staff "My Assigned Tasks" card, so both
// sides of a conversation get an identical thread UI.
//
// Props:
//   task         - the task object (camelCase, from AppContext `tasks`)
//   onClose      - () => void
//   getAssigneeName - optional (userId) => string, used only in the header

const formatTimestamp = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${time}`;
};

const statusBadge = (status) => {
  switch (status) {
    case 'Pending': return 'bg-red-100 text-red-600';
    case 'Accepted': return 'bg-yellow-100 text-yellow-700';
    case 'In Progress': return 'bg-blue-100 text-blue-700';
    case 'Completed': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const TaskThreadModal = ({ task, onClose, getAssigneeName }) => {
  const { currentUser, getTaskComments, addTaskComment, markTaskCommentsRead } = useContext(AppContext);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);

  const pollRef = useRef(null);
  const bottomRef = useRef(null);
  const hasMarkedRead = useRef(false);

  const loadComments = async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getTaskComments(task.id);
    if (res.success) {
      setComments(res.comments);
      setError('');
    } else if (!silent) {
      setError(res.error || 'Could not load comments.');
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    hasMarkedRead.current = false;
    loadComments();

    // Clear the unread badge for whichever side we are, shortly after opening
    // (gives the thread a moment to actually render before "reading" it).
    const readTimer = setTimeout(() => {
      if (!hasMarkedRead.current) {
        hasMarkedRead.current = true;
        markTaskCommentsRead(task.id);
      }
    }, 800);

    // Light polling so an admin and staff member chatting near-simultaneously
    // both see new messages without needing to close/reopen the modal.
    pollRef.current = setInterval(() => loadComments(true), 5000);

    return () => {
      clearTimeout(readTimer);
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [comments.length]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setPosting(true);
    const res = await addTaskComment(task.id, message.trim());
    setPosting(false);

    if (res.success) {
      setComments((prev) => [...prev, res.comment]);
      setMessage('');
    } else {
      setError(res.error || 'Could not post comment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-black truncate">{task.title}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusBadge(task.status)}`}>
                {task.status}
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{task.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {getAssigneeName && (
                <span className="flex items-center gap-1">
                  <MessageCircle size={13} /> {getAssigneeName(task.assignedToId)}
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> Due {task.dueDate}
                </span>
              )}
              {task.priority && (
                <span className="flex items-center gap-1">
                  <Flag size={13} /> {task.priority} priority
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thread */}
        <div className="px-6 py-5 flex-1 overflow-y-auto bg-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={16} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-black">Comments / Discussion</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">
                No comments yet. If you have a question or need clarification, leave one below.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => {
                const isMine = c.authorId === currentUser.id;
                return (
                  <div key={c.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-black">{c.authorName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getRoleBadgeColor(c.authorRole)}`}>
                          {c.authorRole}
                        </span>
                        <span className="text-[11px] text-gray-400">{formatTimestamp(c.createdAt)}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                        }`}
                      >
                        {c.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <form onSubmit={handlePost} className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePost(e);
                }
              }}
              placeholder="Ask a question, add context, or reply..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-28"
            />
            <button
              type="submit"
              disabled={posting || !message.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default TaskThreadModal;
