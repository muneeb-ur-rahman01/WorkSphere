import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, CheckCircle2 } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Input from '../../shared/Input/Input';
import Card from '../../shared/Card/Card';
import api from '../../Config/apiConfig';
import { SELF_REGISTERABLE_ROLES } from '../../Config/constant';
import { isValidStaffPassword, STAFF_PASSWORD_MESSAGE } from '../../utils/passwordValidation';

const Register = () => {
  const { registerStaff } = useContext(AppContext);

  // Fetched directly from the public endpoint (no login required), so this
  // form works for a visitor who has never signed in — the AppContext's
  // `organizations` list is only ever populated for a logged-in user, which
  // is why the dropdown used to always show "no active organizations".
  const [activeOrgs, setActiveOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadOrgs = async () => {
      try {
        const res = await api.get('/organizations/public');
        if (!cancelled) setActiveOrgs(res.data.organizations || []);
      } catch (err) {
        if (!cancelled) setOrgsError('Could not load organizations. Please refresh the page.');
      } finally {
        if (!cancelled) setOrgsLoading(false);
      }
    };
    loadOrgs();
    return () => { cancelled = true; };
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Employee', // Employee, Intern, Volunteer, Membership (see SELF_REGISTERABLE_ROLES)
    orgId: ''
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [submitting, setSubmitting] = useState(false);

  const passwordValid = isValidStaffPassword(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.email || !formData.password || !formData.orgId || !formData.role) {
      setError('Please fill in all fields.');
      return;
    }

    if (!passwordValid) {
      setPasswordTouched(true);
      setError(STAFF_PASSWORD_MESSAGE);
      return;
    }

    setSubmitting(true);
    const res = await registerStaff(
      formData.fullName,
      formData.email,
      formData.password,
      formData.role,
      formData.orgId
    );
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  // Find organization name by ID
  const selectedOrgName = activeOrgs.find(o => o.id === formData.orgId)?.name || 'the selected NGO';

  return (
    <PublicLayout>
      <div style={{
        maxWidth: '520px',
        margin: '60px auto 100px',
        padding: '0 20px'
      }}>
        {success ? (
          <Card className="animate-scale-up" style={{ textAlign: 'center', padding: '40px 30px' }}>
            <div style={{
              display: 'inline-flex',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '16px',
              borderRadius: '50%',
              color: 'var(--success)',
              marginBottom: '24px'
            }}>
              <CheckCircle2 size={48} />
            </div>

            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Application Sent!</h2>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px' }}>
              Hi <strong>{formData.fullName}</strong>, your request to register as a <strong>{formData.role}</strong> 
              for <strong>{selectedOrgName}</strong> has been logged. 
              The organization administrator must review and accept your registration request. 
              Once approved, you'll receive an email and can log in to access your task dashboard and submit camp availability.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/login-choice">
                <Button variant="primary" fullWidth>Go to Login Page</Button>
              </Link>
              <Link to="/">
                <Button variant="secondary" fullWidth>Back to Home</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card
            title="Register as NGO Staff"
            subtitle="Register as an Employee, Intern, Volunteer, or Member for an approved NGO."
            className="animate-slide-up"
          >
            {error && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            {orgsLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>
                Loading organizations…
              </div>
            ) : orgsError ? (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                {orgsError}
              </div>
            ) : activeOrgs.length === 0 ? (
              <div style={{
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning)',
                color: 'var(--warning)',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                textAlign: 'center'
              }}>
                ⚠️ No active organizations found on the platform yet. 
                Please register an organization first before staff can sign up!
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <Input
                  label="Full Name"
                  name="fullName"
                  placeholder="e.g. John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Official Email"
                  name="email"
                  type="email"
                  placeholder="e.g. johndoe@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters, with a letter and a number"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => setPasswordTouched(true)}
                  required
                />
                {passwordTouched && formData.password && !passwordValid && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '-12px', marginBottom: '16px' }}>
                    {STAFF_PASSWORD_MESSAGE}
                  </p>
                )}

                <Input
                  label="Organization"
                  name="orgId"
                  type="select"
                  placeholder="Choose NGO to join..."
                  value={formData.orgId}
                  onChange={handleChange}
                  options={activeOrgs.map(o => ({ value: o.id, label: o.name }))}
                  required
                />

                <Input
                  label="Position / Role"
                  name="role"
                  type="select"
                  value={formData.role}
                  onChange={handleChange}
                  options={SELF_REGISTERABLE_ROLES.map((r) => ({
                    value: r.value,
                    label: `${r.label} — ${r.description}`
                  }))}
                  required
                />

                <Button type="submit" variant="primary" fullWidth disabled={submitting} style={{ gap: '8px', marginTop: '12px' }}>
                  <UserCheck size={16} /> {submitting ? 'Submitting…' : 'Request Workspace Access'}
                </Button>
              </form>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Already registered? <Link to="/login-choice" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login here</Link>
            </div>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
};

export default Register;
