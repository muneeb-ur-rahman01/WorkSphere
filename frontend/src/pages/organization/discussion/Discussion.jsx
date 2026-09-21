import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { getRoleBadgeColor } from '../../../Config/constant';
import { splitTextByLinks } from '../../../utils/linkify';
import {
  Hash, Megaphone, Users, Plus, Send, X, UserPlus, UserMinus,
  Loader2, MessageSquare, Settings2, Search, Pencil, Trash2,
  CornerUpLeft, AtSign, Building2
} from 'lucide-react';

// ============================================================
// Organization Discussion — group/department chat.
//
// Two-pane "modern chat app" layout: a channel list on the left (only
// channels the current user is a member of - enforced server-side too),
// and the active channel's thread + composer on the right. Org Admins get
// extra controls to create new departments and manage channel membership.
// ============================================================

const formatTimestamp = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${time}`;
};

const formatFullTimestamp = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${time}`;
};

const groupInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

const groupColor = (id) => {
  const palette = [
    'from-indigo-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-pink-500 to-rose-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Renders chat text with:
//  - valid web links as real, clickable links (new tab, noopener)
//  - @Member mentions highlighted
const MessageText = ({ text, mentionNames, isMine }) => {
  const mentionRegex = mentionNames.length
    ? new RegExp(
        `(@(?:${[...mentionNames]
          .sort((a, b) => b.length - a.length)
          .map(escapeRegExp)
          .join('|')})(?![\\w]))`,
        'g'
      )
    : null;

  const renderPlain = (value, keyPrefix) => {
    if (!mentionRegex) return value;

    return value.split(mentionRegex).map((chunk, i) =>
      i % 2 === 1 ? (
        <span
          key={`${keyPrefix}-m${i}`}
          className={`rounded px-1 font-semibold ${
            isMine ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {chunk}
        </span>
      ) : (
        chunk
      )
    );
  };

  return (
    <>
      {splitTextByLinks(text).map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            className={`break-all font-medium underline underline-offset-2 ${
              isMine ? 'text-white hover:text-indigo-100' : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            {part.value}
          </a>
        ) : (
          <React.Fragment key={i}>{renderPlain(part.value, i)}</React.Fragment>
        )
      )}
    </>
  );
};

const Discussion = () => {
  const {
    currentUser, users, discussionGroups,
    getGroupMessages, sendGroupMessage, markGroupRead,
    createDiscussionGroup, updateDiscussionGroup, deleteDiscussionGroup,
    getGroupMembers, addGroupMember, removeGroupMember
  } = useContext(AppContext);

  const isAdmin = currentUser.role === 'OrgAdmin';

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [showNewDeptModal, setShowNewDeptModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pollRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);

  // Reply + @mention state
  const [members, setMembers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionState, setMentionState] = useState(null); // { query, start, caret }
  const [mentionIndex, setMentionIndex] = useState(0);
  const [highlightedId, setHighlightedId] = useState(null);

  // Auto-select the first available channel once groups load
  useEffect(() => {
    if (!selectedGroupId && discussionGroups.length > 0) {
      setSelectedGroupId(discussionGroups[0].id);
    }
  }, [discussionGroups, selectedGroupId]);

  const selectedGroup = discussionGroups.find(g => g.id === selectedGroupId) || null;

  // Org Admins manage regular departments. The SuperAdmin <-> Org Admin
  // channels are system-managed, so no edit / members / delete there.
  const canManageSelected = isAdmin && !!selectedGroup && !selectedGroup.isPlatform;

  // Members of the open channel (for @mention suggestions + highlighting)
  useEffect(() => {
    setMembers([]);
    setReplyingTo(null);
    setMentionState(null);
    if (!selectedGroupId) return undefined;

    let cancelled = false;

    getGroupMembers(selectedGroupId).then((res) => {
      if (!cancelled && res.success) setMembers(res.members || []);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, selectedGroup?.memberCount]);

  const mentionNames = useMemo(
    () => members.filter(u => u.id !== currentUser.id).map(u => u.fullName).filter(Boolean),
    [members, currentUser.id]
  );

  const mentionOptions = useMemo(() => {
    if (!mentionState) return [];
    const q = mentionState.query.toLowerCase();

    return members
      .filter(u => u.id !== currentUser.id && u.fullName && u.fullName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionState, members, currentUser.id]);

  const updateMentionState = (text, caret) => {
    const before = text.slice(0, caret);
    const match = /(?:^|\s)@([^\s@][^@\n]{0,30})?$/.exec(before);

    if (!match) {
      setMentionState(null);
      return;
    }

    const query = match[1] || '';
    setMentionState({ query, start: caret - query.length - 1, caret });
    setMentionIndex(0);
  };

  const handleComposerChange = (e) => {
    setComposerText(e.target.value);
    updateMentionState(e.target.value, e.target.selectionStart);
  };

  const pickMention = (user) => {
    if (!mentionState) return;

    const insert = `@${user.fullName} `;
    const next =
      composerText.slice(0, mentionState.start) +
      insert +
      composerText.slice(mentionState.caret);

    const caretAfter = mentionState.start + insert.length;

    setComposerText(next);
    setMentionState(null);

    requestAnimationFrame(() => {
      const el = composerRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(caretAfter, caretAfter);
      }
    });
  };

  const collectMentionIds = (text) => {
    let rest = text;
    const ids = [];

    [...members]
      .filter(u => u.id !== currentUser.id && u.fullName)
      .sort((a, b) => b.fullName.length - a.fullName.length)
      .forEach((u) => {
        const re = new RegExp(`@${escapeRegExp(u.fullName)}(?![\\w])`, 'g');
        if (re.test(rest)) {
          ids.push(u.id);
          rest = rest.replace(re, ' ');
        }
      });

    return ids;
  };

  const startReply = (message) => {
    setReplyingTo(message);
    composerRef.current?.focus();
  };

  const jumpToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId(null), 1600);
  };

  const handleComposerKeyDown = (e) => {
    if (mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickMention(mentionOptions[mentionIndex] || mentionOptions[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const loadMessages = async (groupId, silent = false) => {
    if (!silent) setLoadingMessages(true);
    const res = await getGroupMessages(groupId);
    if (res.success) {
      setMessages(res.messages);
      setError('');
    } else if (!silent) {
      setError(res.error || 'Could not load messages.');
    }
    if (!silent) setLoadingMessages(false);
  };

  useEffect(() => {
    if (!selectedGroupId) return;
    setMessages([]);
    loadMessages(selectedGroupId);

    pollRef.current = setInterval(() => loadMessages(selectedGroupId, true), 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  // Clear the unread badge whenever the thread renders with content -
  // covers both opening a channel and new messages arriving while it's open.
  useEffect(() => {
    if (selectedGroupId && messages.length > 0) {
      markGroupRead(selectedGroupId);
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, selectedGroupId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!composerText.trim() || !selectedGroupId) return;

    setSending(true);
    const text = composerText.trim();

    const res = await sendGroupMessage(selectedGroupId, text, {
      replyToId: replyingTo?.id || null,
      mentionIds: collectMentionIds(text)
    });
    setSending(false);

    if (res.success) {
      setMessages((prev) => [...prev, res.message]);
      setComposerText('');
      setReplyingTo(null);
      setMentionState(null);
      setError('');
    } else {
      setError(res.error || 'Could not send message.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    const confirmed = window.confirm(`Delete #${selectedGroup.name}? This removes all its messages and cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    const res = await deleteDiscussionGroup(selectedGroup.id);
    setDeleting(false);

    if (res.success) {
      setSelectedGroupId(null);
      setMessages([]);
    } else {
      setError(res.error || 'Could not delete department.');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-9rem)] -m-8">
        <div className="flex h-full border-t border-gray-200">

          {/* Channel list */}
          <div className="w-80 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="px-5 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-black flex items-center gap-2">
                  <MessageSquare size={18} className="text-indigo-600" />
                  Discussion
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {discussionGroups.length} channel{discussionGroups.length === 1 ? '' : 's'}
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowNewDeptModal(true)}
                  title="Add Department"
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {discussionGroups.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8 px-4">
                  {currentUser.role === 'SuperAdmin'
                    ? 'No organization channels yet. A channel with each organization\'s admin is created automatically once the organization is active.'
                    : "You aren't a member of any channels yet."}
                  {isAdmin && ' Create a department to get started.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {discussionGroups.map((g) => {
                    const active = g.id === selectedGroupId;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition ${
                          active ? 'bg-white shadow-sm border border-indigo-100' : 'hover:bg-white/70'
                        }`}
                      >
                        <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${groupColor(g.id)} text-white flex items-center justify-center font-bold text-xs`}>
                          {g.isPlatform ? <Building2 size={16} /> : g.isOpen ? <Megaphone size={16} /> : groupInitials(g.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${active ? 'font-bold text-black' : 'font-semibold text-gray-800'}`}>
                              {g.name}
                            </p>
                            {g.lastMessage && (
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {formatTimestamp(g.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 truncate">
                              {g.lastMessage
                                ? `${g.lastMessage.authorId === currentUser.id ? 'You' : g.lastMessage.authorName}: ${g.lastMessage.message}`
                                : 'No messages yet'}
                            </p>
                            {g.unreadCount > 0 && (
                              <span className="shrink-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {g.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active channel */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {!selectedGroup ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                <MessageSquare size={40} className="text-gray-200" />
                <p className="text-sm">Select a channel to start chatting</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br ${groupColor(selectedGroup.id)} text-white flex items-center justify-center`}>
                      {selectedGroup.isPlatform ? <Building2 size={15} /> : selectedGroup.isOpen ? <Megaphone size={15} /> : <Hash size={15} />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-black truncate flex items-center gap-2">
                        {selectedGroup.name}
                        {selectedGroup.isPlatform && (
                          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                            {currentUser.role === 'SuperAdmin' ? 'Organization admin' : 'WorkSphere SuperAdmin'}
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-gray-500 truncate">
                        {selectedGroup.description || 'No description'} · {selectedGroup.memberCount} member{selectedGroup.memberCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  {canManageSelected && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setShowEditModal(true)}
                        title="Edit description"
                        className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowManageModal(true)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                      >
                        <Settings2 size={14} />
                        Manage Members
                      </button>
                      <button
                        onClick={handleDeleteGroup}
                        disabled={deleting}
                        title="Delete department"
                        className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-10 text-gray-400">
                      <Loader2 size={22} className="animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-gray-400">
                        No messages yet. Say hello to #{selectedGroup.name}!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((m) => {
                        const isMine = m.authorId === currentUser.id;
                        const mentionsMe = Array.isArray(m.mentions) && m.mentions.includes(currentUser.id);
                        return (
                          <div
                            key={m.id}
                            id={`msg-${m.id}`}
                            className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-xs font-bold text-black">{isMine ? 'You' : m.authorName}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getRoleBadgeColor(m.authorRole)}`}>
                                  {m.authorRole}
                                </span>
                                <span className="text-[11px] text-gray-400">{formatFullTimestamp(m.createdAt)}</span>
                              </div>

                              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                                <div
                                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm transition-all ${
                                    isMine
                                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                                  } ${mentionsMe && !isMine ? 'ring-2 ring-amber-300' : ''} ${
                                    highlightedId === m.id ? 'ring-4 ring-indigo-300' : ''
                                  }`}
                                >
                                  {/* Quoted message this one replies to */}
                                  {m.replyTo && (
                                    <button
                                      type="button"
                                      onClick={() => m.replyTo.deleted ? null : jumpToMessage(m.replyTo.id)}
                                      className={`mb-2 block w-full text-left rounded-lg border-l-4 px-3 py-1.5 text-xs ${
                                        isMine
                                          ? 'bg-indigo-500/60 border-indigo-200 text-indigo-50'
                                          : 'bg-gray-50 border-indigo-400 text-gray-600'
                                      }`}
                                    >
                                      {m.replyTo.deleted ? (
                                        <span className="italic opacity-80">Original message is no longer available</span>
                                      ) : (
                                        <>
                                          <span className="block font-bold">
                                            {m.replyTo.authorId === currentUser.id ? 'You' : m.replyTo.authorName}
                                          </span>
                                          <span className="block line-clamp-2 whitespace-pre-wrap">{m.replyTo.message}</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <div className="whitespace-pre-wrap">
                                    <MessageText text={m.message} mentionNames={mentionNames} isMine={isMine} />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => startReply(m)}
                                  title="Reply"
                                  className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-60 group-hover:opacity-100 transition"
                                >
                                  <CornerUpLeft size={15} />
                                </button>
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
                <div className="border-t border-gray-200 p-4 bg-white shrink-0">
                  {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

                  {/* Replying to ... */}
                  {replyingTo && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-indigo-500 bg-indigo-50 px-3 py-2">
                      <CornerUpLeft size={14} className="mt-0.5 shrink-0 text-indigo-600" />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-indigo-700">
                          Replying to {replyingTo.authorId === currentUser.id ? 'yourself' : replyingTo.authorName}
                        </p>
                        <p className="truncate text-gray-600">{replyingTo.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        title="Cancel reply"
                        className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex items-end gap-3">
                    <div className="relative flex-1">
                      {/* @mention suggestions */}
                      {mentionOptions.length > 0 && (
                        <div className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                          <p className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                            <AtSign size={12} /> Mention a member
                          </p>
                          {mentionOptions.map((u, idx) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pickMention(u);
                              }}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                                idx === mentionIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate font-semibold text-gray-900">{u.fullName}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeColor(u.role)}`}>
                                {u.role}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea
                        ref={composerRef}
                        value={composerText}
                        onChange={handleComposerChange}
                        onClick={(e) => updateMentionState(e.target.value, e.target.selectionStart)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder={`Message #${selectedGroup.name} — type @ to mention someone`}
                        rows={1}
                        className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-28"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !composerText.trim()}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Send
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showNewDeptModal && (
        <NewDepartmentModal
          orgUsers={users.filter(u => u.orgId === currentUser.orgId && u.id !== currentUser.id)}
          onClose={() => setShowNewDeptModal(false)}
          onCreate={async (name, description, memberIds) => {
            const res = await createDiscussionGroup(name, description, memberIds);
            if (res.success) {
              setShowNewDeptModal(false);
              setSelectedGroupId(res.group.id);
            }
            return res;
          }}
        />
      )}

      {showEditModal && selectedGroup && (
        <EditDepartmentModal
          group={selectedGroup}
          onClose={() => setShowEditModal(false)}
          onSave={async (name, description) => {
            const res = await updateDiscussionGroup(selectedGroup.id, { name, description });
            if (res.success) setShowEditModal(false);
            return res;
          }}
        />
      )}

      {showManageModal && selectedGroup && (
        <ManageMembersModal
          group={selectedGroup}
          currentUser={currentUser}
          orgUsers={users.filter(u => u.orgId === currentUser.orgId)}
          getGroupMembers={getGroupMembers}
          addGroupMember={addGroupMember}
          removeGroupMember={removeGroupMember}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </DashboardLayout>
  );
};

// ============================================================
// New Department modal (OrgAdmin only)
// ============================================================
const NewDepartmentModal = ({ orgUsers, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleUser = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }
    setSaving(true);
    const res = await onCreate(name.trim(), description.trim(), selectedIds);
    setSaving(false);
    if (!res.success) setError(res.error || 'Could not create department.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[85vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">New Department Channel</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Department Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance & Grants Team"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel for?"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">
              Add Members {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
            </label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {orgUsers.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 text-center">No other staff to add yet.</p>
              ) : (
                orgUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black truncate">{u.fullName}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${getRoleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Edit Department modal (OrgAdmin only) — rename + edit description
// ============================================================
const EditDepartmentModal = ({ group, onClose, onSave }) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }
    setSaving(true);
    const res = await onSave(name.trim(), description.trim());
    setSaving(false);
    if (!res.success) setError(res.error || 'Could not update department.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">Edit Department</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Department Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel for?"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Manage Members modal (OrgAdmin only)
// ============================================================
const ManageMembersModal = ({ group, currentUser, orgUsers, getGroupMembers, addGroupMember, removeGroupMember, onClose }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState(null);

  const loadMembers = async () => {
    setLoading(true);
    const res = await getGroupMembers(group.id);
    if (res.success) setMembers(res.members);
    else setError(res.error || 'Could not load members.');
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members]);
  const nonMembers = orgUsers.filter(u => !memberIds.has(u.id));

  const filteredNonMembers = nonMembers.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (userId) => {
    setBusyUserId(userId);
    const res = await addGroupMember(group.id, userId);
    setBusyUserId(null);
    if (res.success) loadMembers();
    else setError(res.error || 'Could not add member.');
  };

  const handleRemove = async (userId) => {
    setBusyUserId(userId);
    const res = await removeGroupMember(group.id, userId);
    setBusyUserId(null);
    if (res.success) loadMembers();
    else setError(res.error || 'Could not remove member.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[85vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-black">Manage Members</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{group.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : (
            <>
              {/* Current Members */}
              <div>
                <h3 className="text-sm font-bold text-black mb-2 flex items-center gap-2">
                  <Users size={14} /> Current Members ({members.length})
                </h3>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-black truncate">
                          {m.fullName} {m.id === currentUser.id && <span className="text-gray-400 font-normal">(you)</span>}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${getRoleBadgeColor(m.role)}`}>
                        {m.role}
                      </span>
                      {m.id !== currentUser.id && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          disabled={busyUserId === m.id}
                          title="Remove from channel"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50 shrink-0"
                        >
                          {busyUserId === m.id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Members */}
              <div>
                <h3 className="text-sm font-bold text-black mb-2 flex items-center gap-2">
                  <UserPlus size={14} /> Add Members
                </h3>

                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredNonMembers.length === 0 ? (
                    <p className="text-sm text-gray-400 p-4 text-center">
                      {nonMembers.length === 0 ? 'Everyone is already in this channel.' : 'No matches.'}
                    </p>
                  ) : (
                    filteredNonMembers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-black truncate">{u.fullName}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${getRoleBadgeColor(u.role)}`}>
                          {u.role}
                        </span>
                        <button
                          onClick={() => handleAdd(u.id)}
                          disabled={busyUserId === u.id}
                          title="Add to channel"
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50 shrink-0"
                        >
                          {busyUserId === u.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discussion;
