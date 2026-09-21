const supabase = require('../config/supabase');

const { clip } = require('../utils/notifyHelpers');

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

// Regular groups belong to one organization and are only reachable by
// members of that organization. "Platform" groups (is_platform) are the
// direct SuperAdmin <-> Organization Admin channels: the group's org_id is
// the organization being talked to, and the SuperAdmin (who has no org of
// their own) is allowed in as well. Group *membership* is still enforced
// separately by assertGroupMember.
const assertGroupOrg = (group, user) => {
  const sameOrg =
    !!user.orgId && group.org_id === user.orgId;

  const allowed = group.is_platform
    ? user.role === 'SuperAdmin' || sameOrg
    : sameOrg;

  if (!allowed) {
    const err = new Error('Not authorized.');
    err.statusCode = 403;
    throw err;
  }
};

const assertNotPlatformGroup = (group) => {
  if (group.is_platform) {
    const err = new Error(
      'This channel is managed by WorkSphere and cannot be changed.'
    );
    err.statusCode = 403;
    throw err;
  }
};

// ------------------------------------------------------------
// SuperAdmin <-> Organization Admin channels
//
// One channel per organization, named after the organization so the
// SuperAdmin can tell at a glance which organization's admin they are
// talking to. Members are every SuperAdmin plus that organization's
// admin(s). Created lazily (and re-synced) so it also covers
// organizations that existed before this feature. Throttled because
// the dashboard polls the group list every few seconds.
// ------------------------------------------------------------
const PLATFORM_SYNC_INTERVAL_MS = 30 * 1000;

let lastPlatformSyncAt = 0;
let platformSyncPromise = null;

const syncPlatformGroups = async () => {
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, status')
    .in('status', ['Active', 'Suspended']);

  if (orgErr) throw orgErr;
  if (!orgs || orgs.length === 0) return;

  const { data: admins, error: adminErr } = await supabase
    .from('users')
    .select('id, role, org_id')
    .in('role', ['SuperAdmin', 'OrgAdmin'])
    .eq('status', 'Active');

  if (adminErr) throw adminErr;

  const superAdminIds = (admins || [])
    .filter((u) => u.role === 'SuperAdmin')
    .map((u) => u.id);

  // Without a SuperAdmin there is nobody to talk to yet.
  if (superAdminIds.length === 0) return;

  const { data: existing, error: groupErr } = await supabase
    .from('discussion_groups')
    .select('id, org_id, name')
    .eq('is_platform', true);

  if (groupErr) throw groupErr;

  const groupByOrg = new Map(
    (existing || []).map((g) => [g.org_id, g])
  );

  // 1. Create the missing channels.
  const missing = orgs.filter((o) => !groupByOrg.has(o.id));

  if (missing.length > 0) {
    const { data: created, error: createErr } = await supabase
      .from('discussion_groups')
      .insert(
        missing.map((o) => ({
          org_id: o.id,
          name: o.name,
          description:
            'Direct channel between the WorkSphere SuperAdmin and this organization\'s admin.',
          is_open: false,
          is_platform: true,
          created_by: superAdminIds[0]
        }))
      )
      .select('id, org_id, name');

    if (createErr) throw createErr;

    (created || []).forEach((g) => groupByOrg.set(g.org_id, g));
  }

  // 2. Keep channel names in sync with organization names.
  for (const org of orgs) {
    const group = groupByOrg.get(org.id);

    if (group && group.name !== org.name) {
      await supabase
        .from('discussion_groups')
        .update({ name: org.name })
        .eq('id', group.id);
    }
  }

  // 3. Make sure every SuperAdmin and the org's admin(s) are members.
  const groupIds = [...groupByOrg.values()].map((g) => g.id);

  const { data: memberRows } = await supabase
    .from('discussion_group_members')
    .select('group_id, user_id')
    .in('group_id', groupIds);

  const have = new Set(
    (memberRows || []).map((m) => `${m.group_id}:${m.user_id}`)
  );

  const toInsert = [];

  for (const org of orgs) {
    const group = groupByOrg.get(org.id);
    if (!group) continue;

    const orgAdminIds = (admins || [])
      .filter((u) => u.role === 'OrgAdmin' && u.org_id === org.id)
      .map((u) => u.id);

    [...superAdminIds, ...orgAdminIds].forEach((userId) => {
      if (!have.has(`${group.id}:${userId}`)) {
        toInsert.push({ group_id: group.id, user_id: userId });
      }
    });
  }

  if (toInsert.length > 0) {
    await supabase
      .from('discussion_group_members')
      .upsert(toInsert, {
        onConflict: 'group_id,user_id',
        ignoreDuplicates: true
      });
  }
};

const ensurePlatformGroups = async () => {
  if (Date.now() - lastPlatformSyncAt < PLATFORM_SYNC_INTERVAL_MS) {
    return;
  }

  if (!platformSyncPromise) {
    platformSyncPromise = syncPlatformGroups()
      .catch((err) => {
        // Most likely the is_platform migration has not been run yet.
        // Regular discussions keep working either way.
        console.error(
          '[discussion] platform group sync failed:',
          err.message
        );
      })
      .finally(() => {
        lastPlatformSyncAt = Date.now();
        platformSyncPromise = null;
      });
  }

  await platformSyncPromise;
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
  if (user.role === 'SuperAdmin' || user.role === 'OrgAdmin') {
    await ensurePlatformGroups();
  }

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

  assertGroupOrg(group, user);
  assertNotPlatformGroup(group);

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

  assertGroupOrg(group, user);
  assertNotPlatformGroup(group);

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

  assertGroupOrg(group, user);
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

  assertGroupOrg(group, user);
  assertNotPlatformGroup(group);

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

  assertGroupOrg(group, user);
  assertNotPlatformGroup(group);

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

  assertGroupOrg(group, user);
  await assertGroupMember(id, user.id);

  const { data, error } = await supabase
    .from('discussion_messages')
    .select('*')
    .eq('group_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Could not load messages.');
  }

  const rows = data || [];
  const byId = new Map(rows.map((m) => [m.id, m]));

  // Attach a small preview of the message being replied to so the client
  // can render the quoted "reply" block without extra requests.
  return rows.map((m) => {
    const base = serializeDiscussionMessage(m);

    if (!m.reply_to_id) {
      return { ...base, replyTo: null };
    }

    const parent = byId.get(m.reply_to_id);

    return {
      ...base,
      replyTo: parent
        ? {
            id: parent.id,
            authorId: parent.author_id,
            authorName: parent.author_name,
            message: clip(parent.message, 160)
          }
        : {
            id: m.reply_to_id,
            authorId: null,
            authorName: null,
            message: null,
            deleted: true
          }
    };
  });
};

const postMessage = async ({
  user,
  id,
  message,
  replyToId,
  mentionIds
}) => {
  const group = await getGroupById(id);

  assertGroupOrg(group, user);
  await assertGroupMember(id, user.id);

  // ---- Reply target must be a message from this same group
  let replyTarget = null;

  if (replyToId) {
    const { data: target } = await supabase
      .from('discussion_messages')
      .select('id, author_id, author_name, message')
      .eq('id', replyToId)
      .eq('group_id', id)
      .maybeSingle();

    if (!target) {
      const err = new Error(
        'The message you are replying to no longer exists.'
      );
      err.statusCode = 400;
      throw err;
    }

    replyTarget = target;
  }

  // ---- Mentions must be members of this group (never trust the client)
  let validMentionIds = [];

  if (Array.isArray(mentionIds) && mentionIds.length > 0) {
    const { data: mentionedRows } = await supabase
      .from('discussion_group_members')
      .select('user_id')
      .eq('group_id', id)
      .in('user_id', mentionIds.slice(0, 25));

    validMentionIds = (mentionedRows || [])
      .map((row) => row.user_id)
      .filter((userId) => userId !== user.id);
  }

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
      message: message.trim(),
      // Only sent when used, so plain messages keep working even before
      // the reply/mention migration has been applied.
      ...(replyTarget ? { reply_to_id: replyTarget.id } : {}),
      ...(validMentionIds.length > 0
        ? { mentions: validMentionIds }
        : {})
    })
    .select()
    .single();

  if (error) {
    throw new Error('Could not send message.');
  }

  const authorName =
    author?.full_name || user.email || 'Someone';

  // ---- Notify mentioned members (and the author being replied to)
  const notifyIds = new Set(validMentionIds);

  const notifications = [];

  if (validMentionIds.length > 0) {
    const { data: mentionedUsers } = await supabase
      .from('users')
      .select('id, role')
      .in('id', validMentionIds);

    (mentionedUsers || []).forEach((mentioned) => {
      notifications.push({
        // SuperAdmin notifications live on org_id = null.
        org_id:
          mentioned.role === 'SuperAdmin' ? null : group.org_id,
        target_user_id: mentioned.id,
        title: `${authorName} mentioned you`,
        message: `In "${group.name}": "${clip(message, 140)}"`,
        type: 'Mention',
        target_role: 'All'
      });
    });
  }

  if (
    replyTarget &&
    replyTarget.author_id &&
    replyTarget.author_id !== user.id &&
    !notifyIds.has(replyTarget.author_id)
  ) {
    const { data: replied } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', replyTarget.author_id)
      .maybeSingle();

    if (replied) {
      notifications.push({
        org_id: replied.role === 'SuperAdmin' ? null : group.org_id,
        target_user_id: replied.id,
        title: `${authorName} replied to your message`,
        message: `In "${group.name}": "${clip(message, 140)}"`,
        type: 'Mention',
        target_role: 'All'
      });
    }
  }

  if (notifications.length > 0) {
    const { error: notifyErr } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifyErr) {
      console.error(
        '[discussion] mention notification failed:',
        notifyErr.message
      );
    }
  }

  // Sender's own message is immediately considered read.
  await supabase
    .from('discussion_group_members')
    .update({
      last_read_at: new Date().toISOString()
    })
    .eq('group_id', id)
    .eq('user_id', user.id);

  return {
    ...serializeDiscussionMessage(msg),
    replyTo: replyTarget
      ? {
          id: replyTarget.id,
          authorId: replyTarget.author_id,
          authorName: replyTarget.author_name,
          message: clip(replyTarget.message, 160)
        }
      : null
  };
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