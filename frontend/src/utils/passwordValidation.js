// Password policy for the public staff self-registration form.
// Keep this in sync with STAFF_PASSWORD_REGEX in
// backend/controllers/authController.js — the backend re-validates
// independently, this is just for instant client-side feedback.
export const STAFF_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const STAFF_PASSWORD_MESSAGE =
  'Password must be at least 8 characters long and include at least one letter and one number.';

export const isValidStaffPassword = (password) => STAFF_PASSWORD_REGEX.test(password || '');
