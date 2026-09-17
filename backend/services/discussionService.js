const supabase = require('../config/supabase');

const {
  serializeDiscussionGroup,
  serializeDiscussionMessage,
  serializeUser
} = require('../utils/serializers');

// ============================================================
// Shared helper
// ============================================================

// Whenever a user's account becomes Active, auto-enroll them
// into every open discussion group within their organization.
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
      openGroups.map((group) => ({
        group_id: group.id,
        user_id: userId
      })),
      {
        onConflict: 'group_id,user_id',
        ignoreDuplicates: true
      }
    );
};

const getGroupById = async (id) => {
  const { data, error } = await supabase
    .from('discussion_groups')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    const err = new Error('Could not load discussion group.');
    err.statusCode = 500;
    throw err;
  }

  if (!data) {
    const err = new Error('Discussion group not found.');
    err.statusCode = 404;
    throw err;
  }

  return data;
};

const assertGroupOrg = (group, orgId) => {
  if (group.org_id !== orgId) {
    const err = new Error('Not authorized.');
    err.statusCode = 403;
    throw err;
  }
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

const assertGroupMember = async (groupId, userId) => {
  const member = await isGroupMember(groupId, userId);

  if (!member) {
    const err = new Error(
      'You are not a member of this group.'
    );
    err.statusCode = 403;
    throw err;
  }
};

// ============================================================
// Groups
// ============================================================

const getMyGroups = async ({ user }) => {
  const { data: memberships, error: memErr } = await supabase
    .from('discussion_group_members')
    .select('group_id, last_read_at')
    .eq('user_id', user.id);

  if (memErr) {
    throw new Error('Could not load discussion groups.');
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const groupIds = memberships.map(
    (membership) => membership.group_id
  );

  const lastReadByGroup = Object.fromEntries(
    memberships.map((membership) => [
      membership.group_id,
      membership.last_read_at
    ])
  );

  const { data: groups, error: groupErr } = await supabase
    .from('discussion_groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: true });

  if (groupErr) {
    throw new Error('Could not load discussion groups.');
  }

  const enriched = await Promise.all(
    (groups || []).map(async (group) => {
      const [
        memberCountRes,
        lastMsgRes,
        unreadCountRes
      ] = await Promise.all([
        supabase
          .from('discussion_group_members')
          .select('id', {
            count: 'exact',
            head: true
          })
          .eq('group_id', group.id),

        supabase
          .from('discussion_messages')
          .select('*')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('discussion_messages')
          .select('id', {
            count: 'exact',
            head: true
          })
          .eq('group_id', group.id)
          .gt(
            'created_at',
            lastReadByGroup[group.id]
          )
      ]);

      return {
        ...serializeDiscussionGroup(group),
        memberCount: memberCountRes.count || 0,
        unreadCount: unreadCountRes.count || 0,
        lastMessage: lastMsgRes.data
          ? serializeDiscussionMessage(lastMsgRes.data)
          : null
      };
    })
  );

  return enriched;
};

const createGroup = async ({
  user,
  name,
  description,
  memberIds
}) => {
  const { data: group, error } = await supabase
    .from('discussion_groups')
    .insert({
      org_id: user.orgId,
      name: name.trim(),
      description: description?.trim() || null,
      is_open: false,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    throw new Error('Could not create department.');
  }

  let validMemberIds = [];

  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const { data: validUsers } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', user.orgId)
      .in('id', memberIds);

    validMemberIds = (validUsers || []).map(
      (user) => user.id
    );
  }

  // Always include the creating admin.
  const memberSet = new Set([
    user.id,
    ...validMemberIds
  ]);

  await supabase
    .from('discussion_group_members')
    .insert(
      [...memberSet].map((userId) => ({
        group_id: group.id,
        user_id: userId
      }))
    );

  return serializeDiscussionGroup(group);
};

const updateGroup = async ({
  user,
  id,
  name,
  description
}) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);

  const updates = {};

  if (name !== undefined) {
    if (!name.trim()) {
      const err = new Error(
        'Department name is required.'
      );
      err.statusCode = 400;
      throw err;
    }

    updates.name = name.trim();
  }

  if (description !== undefined) {
    updates.description =
      description?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    const err = new Error('Nothing to update.');
    err.statusCode = 400;
    throw err;
  }

  const { data: updated, error } = await supabase
    .from('discussion_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Could not update department.');
  }

  return serializeDiscussionGroup(updated);
};

const deleteGroup = async ({ user, id }) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);

  const { error } = await supabase
    .from('discussion_groups')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Could not delete department.');
  }

  return true;
};

// ============================================================
// Members
// ============================================================

const getGroupMembers = async ({ user, id }) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);
  await assertGroupMember(id, user.id);

  const { data: memberRows, error } = await supabase
    .from('discussion_group_members')
    .select('user_id')
    .eq('group_id', id);

  if (error) {
    throw new Error('Could not load members.');
  }

  const userIds = (memberRows || []).map(
    (member) => member.user_id
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: memberUsers } = await supabase
    .from('users')
    .select('*')
    .in('id', userIds);

  return (memberUsers || []).map(serializeUser);
};

const addGroupMember = async ({
  user,
  id,
  userId
}) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);

  const { data: targetUser } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('id', userId)
    .maybeSingle();

  if (
    !targetUser ||
    targetUser.org_id !== user.orgId
  ) {
    const err = new Error(
      'That user is not part of your organization.'
    );
    err.statusCode = 400;
    throw err;
  }

  const { error } = await supabase
    .from('discussion_group_members')
    .upsert(
      {
        group_id: id,
        user_id: userId
      },
      {
        onConflict: 'group_id,user_id',
        ignoreDuplicates: true
      }
    );

  if (error) {
    throw new Error('Could not add member.');
  }

  return true;
};

const removeGroupMember = async ({
  user,
  id,
  userId
}) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);

  if (userId === user.id) {
    const err = new Error(
      'You cannot remove yourself from a group you manage.'
    );
    err.statusCode = 400;
    throw err;
  }

  const { error } = await supabase
    .from('discussion_group_members')
    .delete()
    .eq('group_id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Could not remove member.');
  }

  return true;
};

// ============================================================
// Messages
// ============================================================

const getMessages = async ({ user, id }) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);
  await assertGroupMember(id, user.id);

  const { data, error } = await supabase
    .from('discussion_messages')
    .select('*')
    .eq('group_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Could not load messages.');
  }

  return (data || []).map(
    serializeDiscussionMessage
  );
};

const postMessage = async ({
  user,
  id,
  message
}) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user.orgId);
  await assertGroupMember(id, user.id);

  const { data: author } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: msg, error } = await supabase
    .from('discussion_messages')
    .insert({
      group_id: id,
      author_id: user.id,
      author_name:
        author?.full_name ||
        user.email ||
        'Unknown',
      author_role: user.role,
      message: message.trim()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Could not send message.');
  }

  // Sender's own message is immediately considered read.
  await supabase
    .from('discussion_group_members')
    .update({
      last_read_at: new Date().toISOString()
    })
    .eq('group_id', id)
    .eq('user_id', user.id);

  return serializeDiscussionMessage(msg);
};

const markGroupRead = async ({
  user,
  id
}) => {
  await assertGroupMember(id, user.id);

  const { error } = await supabase
    .from('discussion_group_members')
    .update({
      last_read_at: new Date().toISOString()
    })
    .eq('group_id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(
      'Could not update read status.'
    );
  }

  return true;
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