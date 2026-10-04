import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Paperclip, Plus } from 'lucide-react';
import api from '../../../Config/apiConfig';
import { AppContext } from '../../../context/AppContext';
import { STAFF_ROLE_NAMES } from '../../../Config/constant';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Button from '../../../shared/Button/Button';
import Card from '../../../shared/Card/Card';
import Input from '../../../shared/Input/Input';
import Modal from '../../../shared/Modal/Modal';
import Table from '../../../shared/Table/Table';
import { StatusBadge, Toast } from '../../../shared/HrUi/HrUi';
import { apiError, fmtDate, useToast } from '../../../utils/hrFormat';

const MAX_FILE = 5 * 1024 * 1024;
const emptyForm = { categoryId: '', startDate: '', endDate: '', reason: '' };

const StaffLeave = () => {
  const { currentUser } = useContext(AppContext);
  const [toast, showToast] = useToast();

  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const res = await api.get('/leave/me');
    setRequests(res.data.requests);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get('/leave/categories'), api.get('/leave/me')])
      .then(([c, r]) => {
        if (!alive) return;
        setCategories(c.data.categories);
        setRequests(r.data.requests);
        setLoading(false);
      })
      .catch((err) => { if (alive) { setLoading(false); showToast(apiError(err, 'Could not load leave data.'), 'error'); } });
    return () => { alive = false; };
  }, [showToast]);

  const selectedCat = categories.find((c) => c.id === form.categoryId);

  // Days already requested (Pending + Approved) this year, per category
  const usage = useMemo(() => {
    const year = String(new Date().getFullYear());
    const m = {};
    requests
      .filter((r) => ['Pending', 'Approved'].includes(r.status) && r.startDate.startsWith(year))
      .forEach((r) => { m[r.categoryId] = (m[r.categoryId] || 0) + r.totalDays; });
    return m;
  }, [requests]);

  const shown = requests.filter((r) => statusFilter === 'All' || r.status === statusFilter);

  const openForm = () => { setForm(emptyForm); setFile(null); setFormError(''); setOpen(true); };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
      e.target.value = '';
      return setFormError('Attachment must be a PDF, JPG or PNG file.');
    }
    if (f.size > MAX_FILE) {
      e.target.value = '';
      return setFormError('Attachment must be 5 MB or smaller.');
    }
    setFormError('');
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return; // prevents duplicate submissions on double click
    if (!form.categoryId) return setFormError('Select a leave category.');
    if (!form.startDate || !form.endDate) return setFormError('Select start and end dates.');
    if (form.endDate < form.startDate) return setFormError('End date cannot be before the start date.');
    if (form.reason.trim().length < 3) return setFormError('Please describe the reason for your leave.');
    if (selectedCat?.requiresDocument && !file) return setFormError('A supporting document is required for this leave category.');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('attachment', file);

    setSaving(true);
    setFormError('');
    try {
      await api.post('/leave', fd, { headers: { 'Content-Type': undefined }, timeout: 60000 });
      await reload();
      setOpen(false);
      showToast('Leave request submitted.');
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    try {
      await api.post(`/leave/${id}/cancel`);
      await reload();
      showToast('Leave request cancelled.');
    } catch (err) {
      showToast(apiError(err), 'error');
    }
  };

  const viewAttachment = async (id) => {
    try {
      const res = await api.get(`/leave/${id}/attachment`);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast(apiError(err), 'error');
    }
  };

  if (!currentUser) return <Navigate to="/login/org" replace />;
  if (!STAFF_ROLE_NAMES.includes(currentUser.role)) return <Navigate to="/org-admin/dashboard" replace />;

  return (
    <DashboardLayout>
      <Toast toast={toast} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">Leave Management</h1>
          <p className="text-gray-600 mt-2">Apply for leave and follow the status of your requests.</p>
        </div>
        <Button onClick={openForm}><span className="inline-flex items-center gap-2"><Plus size={16} /> Apply for Leave</span></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border border-blue-200 bg-white p-4">
            <p className="text-sm text-gray-500">{c.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {usage[c.id] || 0}
              <span className="text-sm font-medium text-gray-400"> / {c.annualQuotaDays ?? '∞'} days</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{c.isPaid ? 'Paid' : 'Unpaid'} · this year</p>
          </div>
        ))}
      </div>

      <Card
        title="My Leave Requests"
        actions={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-md px-3 py-1.5 text-sm" aria-label="Filter by status">
            {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      >
        <Table
          headers={['Category', 'From', 'To', 'Days', 'Reason', 'Status', 'Admin remarks', '']}
          data={shown}
          emptyMessage={loading ? 'Loading…' : 'No leave requests yet.'}
          renderRow={(r) => (
            <tr key={r.id}>
              <td>{r.categoryName}</td>
              <td>{fmtDate(r.startDate)}</td>
              <td>{fmtDate(r.endDate)}</td>
              <td>{r.totalDays}</td>
              <td className="max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
              <td><StatusBadge state={r.status} /></td>
              <td className="max-w-[200px] truncate" title={r.adminRemarks || ''}>{r.adminRemarks || '—'}</td>
              <td>
                <div className="flex items-center gap-2 justify-end">
                  {r.hasAttachment && (
                    <button type="button" onClick={() => viewAttachment(r.id)} className="text-blue-600 hover:text-blue-800" title="View attachment" aria-label="View attachment">
                      <Paperclip size={16} />
                    </button>
                  )}
                  {r.status === 'Pending' && <Button size="small" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>}
                </div>
              </td>
            </tr>
          )}
        />
      </Card>

      <Modal isOpen={open} onClose={() => !saving && setOpen(false)} title="Apply for Leave" maxWidth="520px">
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <Input
            label="Leave category" type="select" required value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            options={[{ value: '', label: 'Select category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Start date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Input label="Reason / description" type="textarea" rows={3} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supporting document {selectedCat?.requiresDocument ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
            </label>
            <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={onFile} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" />
            <p className="text-xs text-gray-400 mt-1">PDF, JPG or PNG · up to 5 MB</p>
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default StaffLeave;
