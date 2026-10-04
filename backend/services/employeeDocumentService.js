const crypto = require('crypto');
const supabase = require('../config/supabase');
const { httpErr, toApi, UUID, validDate } = require('./crudFactory');
const { notifyAdmins, notifyUser } = require('../utils/notify');

const BUCKET = 'employee-documents';
const DOC_TYPES = ['Contract', 'ID / Identity', 'Certificate', 'Resume / CV', 'Medical', 'Tax', 'Other'];

const sniff = (b) => {
  if (b.length > 4 && b.slice(0, 4).toString('latin1') === '%PDF') return { mime: 'application/pdf', ext: 'pdf' };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length > 8 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
};

const safeName = (n) => String(n || 'document').replace(/[^\w.\- ]+/g, '_').slice(0, 120);

const list = async ({ user, employeeId }) => {
  let q = supabase.from('employee_documents').select('*').eq('org_id', user.orgId).order('created_at', { ascending: false }).limit(1000);
  if (employeeId) { if (!UUID.test(employeeId)) throw httpErr('Invalid employee.'); q = q.eq('employee_id', employeeId); }
  const { data, error } = await q;
  if (error) throw httpErr('Could not load documents.', 500);
  const ids = [...new Set(data.map((d) => d.employee_id))];
  const { data: emps } = ids.length ? await supabase.from('employees').select('id, full_name, employee_code').eq('org_id', user.orgId).in('id', ids) : { data: [] };
  const en = new Map((emps || []).map((e) => [e.id, `${e.full_name} (${e.employee_code})`]));
  return data.map((d) => { const { file_path, ...rest } = d; return { ...toApi(rest), employeeName: en.get(d.employee_id) || '—' }; });
};

const upload = async ({ user, body, file }) => {
  if (!file) throw httpErr('Select a file to upload.');
  if (!UUID.test(body.employeeId || '')) throw httpErr('Select an employee.');
  const title = String(body.title || '').trim();
  if (title.length < 2 || title.length > 160) throw httpErr('Title must be 2-160 characters.');
  if (!DOC_TYPES.includes(body.docType)) throw httpErr('Select a valid document type.');
  if (body.expiryDate && !validDate(body.expiryDate)) throw httpErr('Expiry date must be valid (YYYY-MM-DD).');
  const type = sniff(file.buffer);
  if (!type) throw httpErr('Document must be a PDF, JPG or PNG file.');
  const { data: emp } = await supabase.from('employees').select('id, user_id, full_name').eq('id', body.employeeId).eq('org_id', user.orgId).maybeSingle();
  if (!emp) throw httpErr('Employee not found.', 404);

  const path = `${user.orgId}/${emp.id}/${crypto.randomUUID()}.${type.ext}`;
  const { error: up } = await supabase.storage.from(BUCKET).upload(path, file.buffer, { contentType: type.mime, upsert: false });
  if (up) throw httpErr('Could not store the document.', 500);
  const { data, error } = await supabase.from('employee_documents').insert({ org_id: user.orgId, employee_id: emp.id, title, doc_type: body.docType, file_path: path, file_name: safeName(file.originalname), mime_type: type.mime, size_bytes: file.size, expiry_date: body.expiryDate || null, uploaded_by: user.id }).select().single();
  if (error) { await supabase.storage.from(BUCKET).remove([path]); throw httpErr('Could not save the document record.', 500); }
  await notifyUser(user.orgId, emp.user_id, 'Document Added to Your Record', `“${title}” was added to your employee documents.`, { dedupe_key: `doc:added:${data.id}` });
  await notifyAdmins(user.orgId, 'Employee Document Uploaded', `“${title}” was uploaded for ${emp.full_name}.`, { dedupe_key: `doc:added:admin:${data.id}` });
  const { file_path, ...rest } = data;
  return toApi(rest);
};

const signedUrl = async ({ user, id }) => {
  if (!UUID.test(id || '')) throw httpErr('Invalid document.');
  const { data } = await supabase.from('employee_documents').select('file_path, file_name').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!data) throw httpErr('Document not found.', 404);
  const { data: s, error } = await supabase.storage.from(BUCKET).createSignedUrl(data.file_path, 120, { download: data.file_name });
  if (error) throw httpErr('Could not open the document.', 500);
  return s.signedUrl;
};

const remove = async ({ user, id }) => {
  if (!UUID.test(id || '')) throw httpErr('Invalid document.');
  const { data } = await supabase.from('employee_documents').delete().eq('id', id).eq('org_id', user.orgId).select().maybeSingle();
  if (!data) throw httpErr('Document not found.', 404);
  await supabase.storage.from(BUCKET).remove([data.file_path]);
};

module.exports = { list, upload, signedUrl, remove, DOC_TYPES };
