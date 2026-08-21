const supabase = require('../config/supabase');
const { serializeDiscussionGroup, serializeDiscussionMessage, serializeUser } = require('../utils/serializers');

// ============================================================
// Helpers shared with other controllers (user activation auto-enrolls
// into "open" channels within their own org)
// ============================================================

// Whenever a user's account becomes Active (self-registration approved, or
// added directly by an admin), auto-enroll them in every "open" group in
// their org - matching how Slack/Teams auto-join you to a #general channel.
const addUserToOpenGroups = async (orgId, userId) => {
  const { data: openGroups } = await supabase
    .from('discussion_groups')
    .select('id')
    .eq('org_id', orgId)
    .eq('is_open', true);

  if (!openGroups || openGroups.length === 0) return;

  await supabase
    .from('discussion_group_members')
    .upsert(
      openGroups.map(g => ({ group_id: g.id, user_id: userId })),
      { onConflict: 'group_id,user_id', ignoreDuplicates: true }
    );
};

const isGroupMember = async (groupId, userId) => {
  const { data } = await supabase
    .from('discussion_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};

const fetchGroupOr404 = async (id, res) => {
  const { data: group, error } = await supabase.from('discussion_groups').select('*').eq('id', id).maybeSingle();
  if (error) {
    res.status(500).json({ success: false, error: 'Could not load discussion group.' });
    return null;
  }
  if (!group) {
    res.status(404).json({ success: false, error: 'Discussion group not found.' });
    return null;
  }
  return group;
};

// ============================================================
// Route handlers
// ============================================================

// GET /api/discussion-groups
// Only returns groups the requester is actually a member of, each enriched
// with member count, unread count, and a preview of the last message.
const getMyGroups = async (req, res) => {
  const { data: memberships, error: memErr } = await supabase
    .from('discussion_group_members')
    .select('group_id, last_read_at')
    .eq('user_id', req.user.id);

  if (memErr) return res.status(500).json({ success: false, error: 'Could not load discussion groups.' });
  if (!memberships || memberships.length === 0) return res.json({ success: true, groups: [] });

  const groupIds = memberships.map(m => m.group_id);
  const lastReadByGroup = Object.fromEntries(memberships.map(m => [m.group_id, m.last_read_at]));

  const { data: groups, error: groupErr } = await supabase
    .from('discussion_groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: true });

  if (groupErr) return res.status(500).json({ success: false, error: 'Could not load discussion groups.' });

  const enriched = await Promise.all((groups || []).map(async (g) => {
    const [memberCountRes, lastMsgRes, unreadCountRes] = await Promise.all([
      supabase.from('discussion_group_members').select('id', { count: 'exact', head: true }).eq('group_id', g.id),
      supabase.from('discussion_messages').select('*').eq('group_id', g.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('discussion_messages').select('id', { count: 'exact', head: true }).eq('group_id', g.id).gt('created_at', lastReadByGroup[g.id])
    ]);

    return {
      ...serializeDiscussionGroup(g),
      memberCount: memberCountRes.count || 0,
      unreadCount: unreadCountRes.count || 0,
      lastMessage: lastMsgRes.data ? serializeDiscussionMessage(lastMsgRes.data) : null
    };
  }));

  return res.json({ success: true, groups: enriched });
};

// POST /api/discussion-groups (OrgAdmin only)  body: { name, description, memberIds }
const createGroup = async (req, res) => {
  const { name, description, memberIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Department name is required.' });
  }

  const { data: group, error } = await supabase
    .from('discussion_groups')
    .insert({
      org_id: req.user.orgId,
      name: name.trim(),
      description: description?.trim() || null,
      is_open: false,
      created_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create department.' });

  // Validate any requested initial members actually belong to this org
  let validMemberIds = [];
  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const { data: validUsers } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', req.user.orgId)
      .in('id', memberIds);
    validMemberIds = (validUsers || []).map(u => u.id);
  }

  // Always include the creating admin
  const memberSet = new Set([req.user.id, ...validMemberIds]);
  await supabase
    .from('discussion_group_members')
    .insert([...memberSet].map(userId => ({ group_id: group.id, user_id: userId })));

  return res.json({ success: true, group: serializeDiscussionGroup(group) });
};

// PATCH /api/discussion-groups/:id (OrgAdmin only)  body: { name?, description? }
// Lets an OrgAdmin rename a channel and/or edit its description. Can't
// touch the "Open Discussion" auto-join channel's core identity by mistake
// from another org since fetchGroupOr404 + org check below guards that.
const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  const updates = {};
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ success: false, error: 'Department name is required.' });
    updates.name = name.trim();
  }
  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'Nothing to update.' });
  }

  const { data: updated, error } = await supabase
    .from('discussion_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update department.' });
  return res.json({ success: true, group: serializeDiscussionGroup(updated) });
};

// DELETE /api/discussion-groups/:id (OrgAdmin only)
// Cascades to discussion_group_members and discussion_messages via the FK
// "on delete cascade" defined in schema.sql, so no manual cleanup needed.
const deleteGroup = async (req, res) => {
  const { id } = req.params;

  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  const { error } = await supabase.from('discussion_groups').delete().eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete department.' });
  return res.json({ success: true });
};

// GET /api/discussion-groups/:id/members
const getGroupMembers = async (req, res) => {
  const { id } = req.params;
  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  const isMember = await isGroupMember(id, req.user.id);
  if (!isMember) return res.status(403).json({ success: false, error: 'You are not a member of this group.' });

  const { data: memberRows, error } = await supabase.from('discussion_group_members').select('user_id').eq('group_id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not load members.' });

  const userIds = (memberRows || []).map(m => m.user_id);
  if (userIds.length === 0) return res.json({ success: true, members: [] });

  const { data: memberUsers } = await supabase.from('users').select('*').in('id', userIds);
  return res.json({ success: true, members: (memberUsers || []).map(serializeUser) });
};

// POST /api/discussion-groups/:id/members (OrgAdmin only)  body: { userId }
const addGroupMember = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId is required.' });

  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  const { data: targetUser } = await supabase.from('users').select('id, org_id').eq('id', userId).maybeSingle();
  if (!targetUser || targetUser.org_id !== req.user.orgId) {
    return res.status(400).json({ success: false, error: 'That user is not part of your organization.' });
  }

  const { error } = await supabase
    .from('discussion_group_members')
    .upsert({ group_id: id, user_id: userId }, { onConflict: 'group_id,user_id', ignoreDuplicates: true });

  if (error) return res.status(500).json({ success: false, error: 'Could not add member.' });
  return res.json({ success: true });
};

// DELETE /api/discussion-groups/:id/members/:userId (OrgAdmin only)
const removeGroupMember = async (req, res) => {
  const { id, userId } = req.params;
  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  if (userId === req.user.id) {
    return res.status(400).json({ success: false, error: 'You cannot remove yourself from a group you manage.' });
  }

  const { error } = await supabase.from('discussion_group_members').delete().eq('group_id', id).eq('user_id', userId);
  if (error) return res.status(500).json({ success: false, error: 'Could not remove member.' });
  return res.json({ success: true });
};

// GET /api/discussion-groups/:id/messages
const getMessages = async (req, res) => {
  const { id } = req.params;
  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  const isMember = await isGroupMember(id, req.user.id);
  if (!isMember) return res.status(403).json({ success: false, error: 'You are not a member of this group.' });

  const { data, error } = await supabase
    .from('discussion_messages')
    .select('*')
    .eq('group_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ success: false, error: 'Could not load messages.' });
  return res.json({ success: true, messages: data.map(serializeDiscussionMessage) });
};

// POST /api/discussion-groups/:id/messages  body: { message }
const postMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  const group = await fetchGroupOr404(id, res);
  if (!group) return;
  if (group.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized.' });

  const isMember = await isGroupMember(id, req.user.id);
  if (!isMember) return res.status(403).json({ success: false, error: 'You are not a member of this group.' });

  const { data: author } = await supabase.from('users').select('full_name').eq('id', req.user.id).maybeSingle();

  const { data: msg, error } = await supabase
    .from('discussion_messages')
    .insert({
      group_id: id,
      author_id: req.user.id,
      author_name: author?.full_name || req.user.email || 'Unknown',
      author_role: req.user.role,
      message: message.trim()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not send message.' });

  // Poster's own copy is implicitly "read" the moment they send it.
  await supabase
    .from('discussion_group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', id)
    .eq('user_id', req.user.id);

  return res.json({ success: true, message: serializeDiscussionMessage(msg) });
};

// PATCH /api/discussion-groups/:id/read
const markGroupRead = async (req, res) => {
  const { id } = req.params;
  const isMember = await isGroupMember(id, req.user.id);
  if (!isMember) return res.status(403).json({ success: false, error: 'You are not a member of this group.' });

  const { error } = await supabase
    .from('discussion_group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ success: false, error: 'Could not update read status.' });
  return res.json({ success: true });
};

module.exports = {
  addUserToOpenGroups,
  getMyGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  getMessages,
  postMessage,
  markGroupRead
};
