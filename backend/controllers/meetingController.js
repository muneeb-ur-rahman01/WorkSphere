const supabase = require('../config/supabase');
const { serializeMeeting } = require('../utils/serializers');

const MEETING_TYPES = ['Online', 'Offline'];
const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

// GET /api/meetings
// Same org-wide visibility model as Events: any authenticated member of the
// organization (OrgAdmin or staff-tier) can see every meeting for their org,
// so a created meeting is immediately visible to all relevant users.
const getMeetings = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase
    .from('meetings')
    .select('*')
    .order('meeting_date', { ascending: false })
    .order('meeting_time', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch meetings.' });
  return res.json({ success: true, meetings: data.map(serializeMeeting) });
};

// POST /api/meetings (OrgAdmin)  body: { subject, meetingType, date, time, meetingLink }
// Broadcasts a notification to the organization, same as Events/Camps, so
// the meeting becomes visible to members right away.
const createMeeting = async (req, res) => {
  const { subject, meetingType, date, time, meetingLink } = req.body;
  if (!subject || !date || !time) {
    return res.status(400).json({ success: false, error: 'Subject, date and time are required.' });
  }

  const type = MEETING_TYPES.includes(meetingType) ? meetingType : 'Online';
  if (type === 'Online' && !meetingLink) {
    return res.status(400).json({ success: false, error: 'Meeting link is required for online meetings.' });
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      org_id: req.user.orgId,
      subject,
      meeting_type: type,
      meeting_date: date,
      meeting_time: time,
      meeting_link: meetingLink || null,
      status: 'Upcoming',
      created_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create meeting.' });

  await supabase.from('notifications').insert({
    org_id: req.user.orgId,
    title: `${subject} - New Meeting Scheduled`,
    message: `A new ${type.toLowerCase()} meeting "${subject}" has been scheduled on ${date} at ${time}.`,
    type: 'MeetingAlert',
    target_role: 'All'
  });

  return res.json({ success: true, meeting: serializeMeeting(meeting) });
};

// PATCH /api/meetings/:id (OrgAdmin)
// body: { subject, meetingType, date, time, meetingLink, status, summary }
// Also used to attach the post-meeting summary once a meeting is complete.
const updateMeeting = async (req, res) => {
  const { id } = req.params;
  const { subject, meetingType, date, time, meetingLink, status, summary } = req.body;

  const { data: existing } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .maybeSingle();

  if (!existing) return res.status(404).json({ success: false, error: 'Meeting not found.' });

  const updates = {};
  if (subject !== undefined) updates.subject = subject;
  if (meetingType !== undefined) {
    if (!MEETING_TYPES.includes(meetingType)) {
      return res.status(400).json({ success: false, error: 'Invalid meeting type.' });
    }
    updates.meeting_type = meetingType;
  }
  if (date !== undefined) updates.meeting_date = date;
  if (time !== undefined) updates.meeting_time = time;
  if (meetingLink !== undefined) updates.meeting_link = meetingLink || null;
  if (status !== undefined) {
    if (!MEETING_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }
    updates.status = status;
  }
  if (summary !== undefined) updates.summary = summary;

  // Validate the effective (post-update) type/link combination
  const effectiveType = updates.meeting_type || existing.meeting_type;
  const effectiveLink = updates.meeting_link !== undefined ? updates.meeting_link : existing.meeting_link;
  if (effectiveType === 'Online' && !effectiveLink) {
    return res.status(400).json({ success: false, error: 'Meeting link is required for online meetings.' });
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update meeting.' });

  // Let the org know a recap is now available, mirroring the "new meeting"
  // broadcast above so summaries get the same org-wide visibility.
  if (summary !== undefined && summary && summary !== existing.summary) {
    await supabase.from('notifications').insert({
      org_id: req.user.orgId,
      title: `${meeting.subject} - Meeting Summary Added`,
      message: `A summary is now available for "${meeting.subject}".`,
      type: 'MeetingAlert',
      target_role: 'All'
    });
  }

  return res.json({ success: true, meeting: serializeMeeting(meeting) });
};

// DELETE /api/meetings/:id (OrgAdmin)
const deleteMeeting = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id)
    .eq('org_id', req.user.orgId);

  if (error) return res.status(500).json({ success: false, error: 'Could not delete meeting.' });
  return res.json({ success: true });
};

module.exports = { getMeetings, createMeeting, updateMeeting, deleteMeeting };
