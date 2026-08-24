const supabase = require('../config/supabase');
const { serializeMeeting } = require('../utils/serializers');

const MEETING_TYPES = ['Online', 'Offline'];
const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

// ============================================================
// GET /api/meetings
// ============================================================
const getMeetings = async (req, res) => {
  try {
    console.log('GET /meetings');
    console.log('User:', req.user);

    const orgId =
      req.user.role === 'SuperAdmin'
        ? req.query.orgId
        : req.user.orgId;

    console.log('Org ID:', orgId);

    let query = supabase
      .from('meetings')
      .select('*');

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;

    console.log('MEETINGS DATA:', data);
    console.log('MEETINGS ERROR:', error);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    return res.json({
      success: true,
      meetings: (data || []).map(serializeMeeting)
    });

  } catch (err) {
    console.error('GET MEETINGS CRASH:', err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ============================================================
// POST /api/meetings
// ============================================================
const createMeeting = async (req, res) => {
  try {
    console.log('\n========== CREATE MEETING ==========');
    console.log('User:', req.user);
    console.log('Body:', req.body);

    const {
      subject,
      meetingType,
      date,
      time,
      meetingLink
    } = req.body;

    if (!subject || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Subject, date and time are required.'
      });
    }

    const type = MEETING_TYPES.includes(meetingType)
      ? meetingType
      : 'Online';

    if (type === 'Online' && !meetingLink) {
      return res.status(400).json({
        success: false,
        error: 'Meeting link is required for online meetings.'
      });
    }

    const meetingData = {
      org_id: req.user.orgId,
      subject,
      meeting_type: type,
      meeting_date: date,
      meeting_time: time,
      meeting_link: meetingLink || null,
      status: 'Upcoming',
      created_by: req.user.id
    };

    console.log('Meeting data going to Supabase:');
    console.log(meetingData);

    const {
      data: meeting,
      error
    } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();

    if (error) {
      console.error('\n========== SUPABASE CREATE MEETING ERROR ==========');
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('===============================================\n');

      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log('Created meeting:', meeting);

    // Notification
    const {
      error: notificationError
    } = await supabase
      .from('notifications')
      .insert({
        org_id: req.user.orgId,
        title: `${subject} - New Meeting Scheduled`,
        message: `A new ${type.toLowerCase()} meeting "${subject}" has been scheduled on ${date} at ${time}.`,
        type: 'MeetingAlert',
        target_role: 'All'
      });

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
      // Meeting already created, so don't fail the whole request.
    }

    console.log('====================================\n');

    return res.json({
      success: true,
      meeting: serializeMeeting(meeting)
    });

  } catch (err) {
    console.error('\n========== CREATE MEETING CRASH ==========');
    console.error(err);
    console.error('==========================================\n');

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ============================================================
// PATCH /api/meetings/:id
// ============================================================
const updateMeeting = async (req, res) => {
  try {
    console.log('\n========== UPDATE MEETING ==========');
    console.log('User:', req.user);
    console.log('Meeting ID:', req.params.id);
    console.log('Body:', req.body);

    const { id } = req.params;

    const {
      subject,
      meetingType,
      date,
      time,
      meetingLink,
      status,
      summary
    } = req.body;

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('org_id', req.user.orgId)
      .maybeSingle();

    if (existingError) {
      console.error('Existing meeting query error:', existingError);

      return res.status(500).json({
        success: false,
        error: existingError.message,
        code: existingError.code,
        details: existingError.details,
        hint: existingError.hint
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found.'
      });
    }

    const updates = {};

    if (subject !== undefined) {
      updates.subject = subject;
    }

    if (meetingType !== undefined) {
      if (!MEETING_TYPES.includes(meetingType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid meeting type.'
        });
      }

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
      if (!MEETING_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value.'
        });
      }

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

    if (effectiveType === 'Online' && !effectiveLink) {
      return res.status(400).json({
        success: false,
        error: 'Meeting link is required for online meetings.'
      });
    }

    console.log('Updates:', updates);

    const {
      data: meeting,
      error
    } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .eq('org_id', req.user.orgId)
      .select()
      .single();

    if (error) {
      console.error('\n========== SUPABASE UPDATE MEETING ERROR ==========');
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('===============================================\n');

      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    // Meeting summary notification
    if (
      summary !== undefined &&
      summary &&
      summary !== existing.summary
    ) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          org_id: req.user.orgId,
          title: `${meeting.subject} - Meeting Summary Added`,
          message: `A summary is now available for "${meeting.subject}".`,
          type: 'MeetingAlert',
          target_role: 'All'
        });

      if (notificationError) {
        console.error(
          'Summary notification error:',
          notificationError
        );
      }
    }

    console.log('Updated meeting:', meeting);
    console.log('====================================\n');

    return res.json({
      success: true,
      meeting: serializeMeeting(meeting)
    });

  } catch (err) {
    console.error('\n========== UPDATE MEETING CRASH ==========');
    console.error(err);
    console.error('==========================================\n');

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// ============================================================
// DELETE /api/meetings/:id
// ============================================================
const deleteMeeting = async (req, res) => {
  try {
    console.log('\n========== DELETE MEETING ==========');
    console.log('User:', req.user);
    console.log('Meeting ID:', req.params.id);

    const { id } = req.params;

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
      .eq('org_id', req.user.orgId);

    if (error) {
      console.error('\n========== SUPABASE DELETE MEETING ERROR ==========');
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('===============================================\n');

      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log('Meeting deleted successfully');
    console.log('====================================\n');

    return res.json({
      success: true
    });

  } catch (err) {
    console.error('\n========== DELETE MEETING CRASH ==========');
    console.error(err);
    console.error('==========================================\n');

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


module.exports = {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting
};