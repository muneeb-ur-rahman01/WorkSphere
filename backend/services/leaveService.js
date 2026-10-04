const crypto = require('crypto');
const supabase = require('../config/supabase');

const BUCKET = 'leave-attachments';

const httpErr = (message, statusCode) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

// Trust file content, not the client-declared mimetype.
const sniff = (buf) => {
  if (buf.length > 4 && buf.slice(0, 4).toString('latin1') === '%PDF') return { mime: 'application/pdf', ext: 'pdf' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
};

const serializeCategory = (c) => ({
  id: c.id, name: c.name, isPaid: c.is_paid, annualQuotaDays: c.annual_quota_days,
  requiresDocument: c.requires_document, isActive: c.is_active
});

const serializeRequest = (r, extra = {}) => ({
  id: r.id, userId: r.user_id, categoryId: r.category_id,
  startDate: r.start_date, endDate: r.end_date, totalDays: r.total_days,
  reason: r.reason, hasAttachment: !!r.attachment_path,
  status: r.status, reviewedAt: r.reviewed_at, adminRemarks: r.admin_remarks,
  createdAt: r.created_at, ...extra
});

const withCategoryNames = async (orgId, rows) => {
  const { data } = await supabase.from('leave_categories').select('id, name, is_paid').eq('org_id', orgId);
  const map = new Map((data || []).map((c) => [c.id, c]));
  return rows.map((r) => serializeRequest(r, {
    categoryName: map.get(r.category_id)?.name || 'Leave',
    isPaid: map.get(r.category_id)?.is_paid ?? true
  }));
};

// ---------- categories ----------

const listCategories = async ({ user, includeInactive }) => {
  let q = supabase.from('leave_categories').select('*').eq('org_id', user.orgId).order('created_at');
  if (!(includeInactive && user.role === 'OrgAdmin')) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw httpErr('Could not load leave categories.', 500);
  return data.map(serializeCategory);
};

const saveCategory = async ({ user, id, name, isPaid, annualQuotaDays, requiresDocument, isActive }) => {
  const row = {};
  if (name !== undefined) row.name = name;
  if (isPaid !== undefined) row.is_paid = isPaid;
  if (annualQuotaDays !== undefined) row.annual_quota_days = annualQuotaDays;
  if (requiresDocument !== undefined) row.requires_document = requiresDocument;
  if (isActive !== undefined) row.is_active = isActive;

  const q = id
    ? supabase.from('leave_categories').update(row).eq('id', id).eq('org_id', user.orgId)
    : supabase.from('leave_categories').insert({ ...row, org_id: user.orgId });
  const { data, error } = await q.select().maybeSingle();
  if (error) {
    if (error.code === '23505') throw httpErr('A leave category with this name already exists.', 409);
    throw httpErr('Could not save leave category.', 500);
  }
  if (!data) throw httpErr('Leave category not found.', 404);
  return serializeCategory(data);
};

// ---------- staff ----------

const createRequest = async ({ user, categoryId, startDate, endDate, reason, file }) => {
  const { data: cat } = await supabase.from('leave_categories').select('*')
    .eq('id', categoryId).eq('org_id', user.orgId).eq('is_active', true).maybeSingle();
  if (!cat) throw httpErr('Invalid leave category.', 400);

  const oldest = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  if (startDate < oldest) throw httpErr('Leave cannot start more than 30 days in the past.', 400);
  if (endDate < startDate) throw httpErr('End date cannot be before the start date.', 400);

  const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 864e5) + 1;

  if (cat.annual_quota_days != null) {
    const year = startDate.slice(0, 4);
    const { data: used } = await supabase.from('leave_requests').select('total_days')
      .eq('user_id', user.id).eq('category_id', cat.id).in('status', ['Pending', 'Approved'])
      .gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`);
    const usedDays = (used || []).reduce((s, r) => s + r.total_days, 0);
    if (usedDays + days > cat.annual_quota_days) {
      throw httpErr(`This would exceed the annual quota for ${cat.name} (${usedDays} of ${cat.annual_quota_days} days already requested).`, 400);
    }
  }

  if (cat.requires_document && !file) throw httpErr('A supporting document is required for this leave category.', 400);

  let attachmentPath = null;
  if (file) {
    const type = sniff(file.buffer);
    if (!type) throw httpErr('Attachment must be a PDF, JPG or PNG file.', 400);
    attachmentPath = `${user.orgId}/${user.id}/${crypto.randomUUID()}.${type.ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(attachmentPath, file.buffer, { contentType: type.mime, upsert: false });
    if (upErr) throw httpErr('Could not upload the attachment.', 500);
  }

  const { data, error } = await supabase.from('leave_requests').insert({
    org_id: user.orgId, user_id: user.id, category_id: cat.id,
    start_date: startDate, end_date: endDate, reason: reason.trim(), attachment_path: attachmentPath
  }).select().single();

  if (error) {
    if (attachmentPath) await supabase.storage.from(BUCKET).remove([attachmentPath]);
    if (error.code === '23P01') throw httpErr('You already have a pending or approved leave request overlapping these dates.', 409);
    throw httpErr('Could not submit leave request.', 500);
  }

  const { data: me } = await supabase.from('users').select('full_name').eq('id', user.id).maybeSingle();
  await supabase.from('notifications').insert({
    org_id: user.orgId, title: 'New Leave Request',
    message: `${me?.full_name || 'A staff member'} requested ${cat.name} from ${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''}).`,
    type: 'GeneralAlert', target_role: 'OrgAdmin', dedupe_key: `leave:submitted:${data.id}`
  });

  return (await withCategoryNames(user.orgId, [data]))[0];
};

const listMine = async ({ user }) => {
  const { data, error } = await supabase.from('leave_requests').select('*')
    .eq('user_id', user.id).eq('org_id', user.orgId).order('created_at', { ascending: false }).limit(200);
  if (error) throw httpErr('Could not load leave requests.', 500);
  return withCategoryNames(user.orgId, data);
};

const cancelMine = async ({ user, id }) => {
  const { data, error } = await supabase.from('leave_requests').update({ status: 'Cancelled' })
    .eq('id', id).eq('user_id', user.id).eq('org_id', user.orgId).eq('status', 'Pending').select().maybeSingle();
  if (error) throw httpErr('Could not cancel leave request.', 500);
  if (!data) throw httpErr('Only your own pending requests can be cancelled.', 409);
  return (await withCategoryNames(user.orgId, [data]))[0];
};

// ---------- OrgAdmin ----------

const listOrg = async ({ user, status }) => {
  let q = supabase.from('leave_requests').select('*').eq('org_id', user.orgId).order('created_at', { ascending: false }).limit(500);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw httpErr('Could not load leave requests.', 500);
  const rows = await withCategoryNames(user.orgId, data);
  const ids = [...new Set(data.map((r) => r.user_id))];
  const { data: people } = ids.length
    ? await supabase.from('users').select('id, full_name, role').eq('org_id', user.orgId).in('id', ids)
    : { data: [] };
  const map = new Map((people || []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, staffName: map.get(r.userId)?.full_name || 'Unknown', staffRole: map.get(r.userId)?.role }));
};

const review = async ({ user, id, decision, remarks }) => {
  const { data, error } = await supabase.from('leave_requests')
    .update({ status: decision, reviewed_by: user.id, admin_remarks: remarks || null })
    .eq('id', id).eq('org_id', user.orgId).eq('status', 'Pending').select().maybeSingle();
  if (error) throw httpErr('Could not update leave request.', 500);
  if (!data) {
    const { data: exists } = await supabase.from('leave_requests').select('status').eq('id', id).eq('org_id', user.orgId).maybeSingle();
    if (!exists) throw httpErr('Leave request not found.', 404);
    throw httpErr(`This request was already ${exists.status.toLowerCase()}.`, 409);
  }

  const word = decision === 'Approved' ? 'approved' : 'rejected';
  await supabase.from('notifications').insert({
    org_id: user.orgId,
    title: `Leave Request ${decision}`,
    message: `Your leave request (${data.start_date} to ${data.end_date}) was ${word}.${remarks ? ` Remarks: ${remarks.slice(0, 200)}` : ''}`,
    type: 'GeneralAlert', target_role: 'All', target_user_id: data.user_id,
    dedupe_key: `leave:${decision.toLowerCase()}:${data.id}`
  });
  return (await withCategoryNames(user.orgId, [data]))[0];
};

// Owner or same-org OrgAdmin only. Returns a short-lived signed URL.
const getAttachmentUrl = async ({ user, id }) => {
  const { data } = await supabase.from('leave_requests').select('user_id, org_id, attachment_path').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!data || !data.attachment_path) throw httpErr('Attachment not found.', 404);
  if (user.role !== 'OrgAdmin' && data.user_id !== user.id) throw httpErr('Attachment not found.', 404);
  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(data.attachment_path, 120);
  if (error) throw httpErr('Could not open the attachment.', 500);
  return signed.signedUrl;
};

module.exports = { listCategories, saveCategory, createRequest, listMine, cancelMine, listOrg, review, getAttachmentUrl };
