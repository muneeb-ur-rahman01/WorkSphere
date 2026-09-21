const supabase = require('../config/supabase');
const { serializeMeeting } = require('../utils/serializers');

const {
  getActorName,
  formatDateLabel,
  formatTimeLabel
} = require('../utils/notifyHelpers');

const MEETING_TYPES = ['Online', 'Offline'];
const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

const getMeetings = async ({ user, orgId }) => {
  const targetOrgId = user.role === 'SuperAdmin' ? orgId : user.orgId;

  let query = supabase
    .from('meetings')
    .select('*')
    .order('meeting_date', { ascending: false })
    .order('meeting_time', { ascending: false });

  if (targetOrgId) {
    query = query.eq('org_id', targetOrgId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch meetings.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeMeeting);
};

const createMeeting = async ({
  user,
  subject,
  meetingType,
  date,
  time,
  meetingLink
}) => {
  const type = MEETING_TYPES.includes(meetingType)
    ? meetingType
    : 'Online';

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      org_id: user.orgId,
      subject,
      meeting_type: type,
      meeting_date: date,
      meeting_time: time,
      meeting_link: meetingLink || null,
      status: 'Upcoming',
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not create meeting.');
    err.statusCode = 500;
    throw err;
  }

  const scheduledBy = await getActorName(user);

  await supabase.from('notifications').insert({
    org_id: user.orgId,
    title: `New Meeting: ${subject}`,
    message:
      `${scheduledBy} scheduled a new ${type.toLowerCase()} meeting "${subject}" ` +
      `on ${formatDateLabel(date)}${time ? ` at ${formatTimeLabel(time)}` : ''}.` +
      (type === 'Online' && meetingLink
        ? ` Join link: ${meetingLink}`
        : ''),
    type: 'MeetingAlert',
    target_role: 'All'
  });

  return serializeMeeting(meeting);
};

const updateMeeting = async ({
  user,
  id,
  subject,
  meetingType,
  date,
  time,
  meetingLink,
  status,
  summary
}) => {
  const { data: existing, error: existingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .eq('org_id', user.orgId)
    .maybeSingle();

  if (existingError) {
    const err = new Error('Could not fetch meeting.');
    err.statusCode = 500;
    throw err;
  }

  if (!existing) {
    const err = new Error('Meeting not found.');
    err.statusCode = 404;
    throw err;
  }

  const updates = {};

  if (subject !== undefined) {
    updates.subject = subject;
  }

  if (meetingType !== undefined) {
    updates.meeting_type = meetingType;
  }

  if (date !== undefined) {
    updates.meeting_date = date;
  }

  if (time !== undefined) {
    updates.meeting_time = time;
  }

  if (meetingLink !== undefined) {
    updates.meeting_link = meetingLink || null;
  }

  if (status !== undefined) {
    updates.status = status;
  }

  if (summary !== undefined) {
    updates.summary = summary;
  }

  const effectiveType =
    updates.meeting_type || existing.meeting_type;

  const effectiveLink =
    updates.meeting_link !== undefined
      ? updates.meeting_link
      : existing.meeting_link;

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update meeting.');
    err.statusCode = 500;
    throw err;
  }

  if (
    summary !== undefined &&
    summary &&
    summary !== existing.summary
  ) {
    await supabase.from('notifications').insert({
      org_id: user.orgId,
      title: `${meeting.subject} - Meeting Summary Added`,
      message: `A summary is now available for "${meeting.subject}".`,
      type: 'MeetingAlert',
      target_role: 'All'
    });
  }

  return serializeMeeting(meeting);
};

const deleteMeeting = async ({ user, id }) => {
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete meeting.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  MEETING_TYPES,
  MEETING_STATUSES,
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting
};