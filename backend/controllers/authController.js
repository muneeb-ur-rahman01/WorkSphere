const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = require('../config/supabase');

const { serializeUser } = require('../utils/serializers');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { seedDefaultGroups } = require('./discussionController');
const { getPlan } = require('../config/plans');
const {
  logBillingEvent,
  BILLING_EVENTS
} = require('../utils/billingAudit');
const { getActiveGateway } = require('../utils/paymentGateways');

const {
  recordLoginResult
} = require('../middleware/rateLimiter');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const genTxnRefNo = () =>
  `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

/*
|--------------------------------------------------------------------------
| Self-registerable roles
|--------------------------------------------------------------------------
*/

const SELF_REGISTERABLE_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership'
];

/*
|--------------------------------------------------------------------------
| Password / email settings
|--------------------------------------------------------------------------
*/

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Password policy for public staff self-registration:
// exactly 8 characters, at least one letter and one number.
const STAFF_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8}$/;

const STAFF_PASSWORD_MESSAGE =
  'Password must be exactly 8 characters long and include at least one letter and one number.';

const PASSWORD_MAX_LENGTH = 8;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_MESSAGE = 'Please enter a valid email address.';

const PASSWORD_LENGTH_MESSAGE =
  'Password must not exceed 8 characters.';

const isValidEmail = (email) => {
  return (
    typeof email === 'string' &&
    EMAIL_REGEX.test(email.trim())
  );
};

const isValidPasswordLength = (password) => {
  return (
    typeof password === 'string' &&
    password.length <= PASSWORD_MAX_LENGTH
  );
};

/*
|--------------------------------------------------------------------------
| Forgot-password throttle
|--------------------------------------------------------------------------
*/

const forgotPasswordAttempts = new Map();
// email -> timestamp of last request

const {
  FORGOT_PASSWORD_COOLDOWN_MS
} = require('../config/security');
// 1 request per email per minute

/*
|--------------------------------------------------------------------------
| Password reset helpers
|--------------------------------------------------------------------------
*/

const hashToken = (rawToken) =>
  crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

/*
|--------------------------------------------------------------------------
| JWT
|--------------------------------------------------------------------------
*/

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      orgId: user.org_id,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};


const login = async (req, res) => {
  try {
    const {
      email,
      password,
      roleDomain
    } = req.body;


    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both email and password.'
      });
    }


    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: EMAIL_MESSAGE
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize email
    |--------------------------------------------------------------------------
    */

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Find user
    |--------------------------------------------------------------------------
    */

    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error(
        '[login] User lookup failed:',
        error.message
      );

      return res.status(500).json({
        success: false,
        error: 'Server error. Please try again.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | User does not exist
    |--------------------------------------------------------------------------
    |
    | Count as failed login attempt.
    |
    */

    if (!user) {
      recordLoginResult(
        normalizedEmail,
        false
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Password verification
    |--------------------------------------------------------------------------
    */

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    /*
    |--------------------------------------------------------------------------
    | Wrong password
    |--------------------------------------------------------------------------
    */

    if (!match) {
      recordLoginResult(
        normalizedEmail,
        false
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Account status
    |--------------------------------------------------------------------------
    */

    if (user.status === 'Pending') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending Admin approval.'
      });
    }

    if (
      user.status === 'Suspended' ||
      user.status === 'Rejected'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Your account access has been restricted.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Role/domain authorization
    |--------------------------------------------------------------------------
    */

    if (
      roleDomain === 'SuperAdmin' &&
      user.role !== 'SuperAdmin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to Super Admin Portal.'
      });
    }

    if (
      roleDomain === 'OrgAdmin' &&
      user.role !== 'OrgAdmin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to Organization Administration.'
      });
    }

    if (
      roleDomain === 'Staff' &&
      ['SuperAdmin', 'OrgAdmin'].includes(user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Please use the Admin login page.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Successful login
    |--------------------------------------------------------------------------
    |
    | Clear failed attempts and remove any lockout state.
    |
    */

    recordLoginResult(
      normalizedEmail,
      true
    );

    /*
    |--------------------------------------------------------------------------
    | Generate JWT
    |--------------------------------------------------------------------------
    */

    const token = signToken(user);

    /*
    |--------------------------------------------------------------------------
    | Update last login
    |--------------------------------------------------------------------------
    |
    | Fire-and-forget so login response isn't blocked.
    |
    */

    supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .then(({ error: loginErr }) => {
        if (loginErr) {
          console.error(
            '[login] Failed to record last_login_at:',
            loginErr.message
          );
        }
      });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,
      token,
      user: serializeUser(user)
    });

  } catch (error) {
    console.error(
      '[login] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }
};



const registerOrganization = async (req, res) => {
  try {
    const {
      orgName,
      adminName,
      email,
      password,
      plan
    } = req.body;

    if (
      !orgName ||
      !adminName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Email validation
    |--------------------------------------------------------------------------
    */

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: EMAIL_MESSAGE
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Password maximum length
    |--------------------------------------------------------------------------
    */

    if (!isValidPasswordLength(password)) {
      return res.status(400).json({
        success: false,
        error: PASSWORD_LENGTH_MESSAGE
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Plan
    |--------------------------------------------------------------------------
    */

    const planConfig =
      getPlan(plan) || getPlan('Basic');

    /*
    |--------------------------------------------------------------------------
    | Check existing user
    |--------------------------------------------------------------------------
    */

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      console.error(
        '[registerOrganization] Existing-user check failed:',
        existingError.message
      );

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create organization
    |--------------------------------------------------------------------------
    */

    const now = new Date();

    const {
      data: org,
      error: orgErr
    } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        email: normalizedEmail,
        sub_plan: planConfig.key,
        status: 'Pending',
        payment_status: 'Unpaid',
        subscription_status: 'TrialPending',
        registration_date: now.toISOString(),
        amount_due: planConfig.price,
        plan_price: planConfig.price,
        billing_cycle: planConfig.billingCycle
      })
      .select()
      .single();

    if (orgErr) {
      console.error(
        '[registerOrganization] Organization creation failed:',
        orgErr.message
      );

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash password
    |--------------------------------------------------------------------------
    */

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    /*
    |--------------------------------------------------------------------------
    | Create admin user
    |--------------------------------------------------------------------------
    */

    const {
      data: adminUser,
      error: userErr
    } = await supabase
      .from('users')
      .insert({
        full_name: adminName,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: 'OrgAdmin',
        org_id: org.id,
        status: 'Pending'
      })
      .select()
      .single();

    if (userErr) {
      console.error(
        '[registerOrganization] User creation failed:',
        userErr.message
      );

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Seed default discussion groups
    |--------------------------------------------------------------------------
    */

    await seedDefaultGroups(
      org.id,
      adminUser.id
    );

    /*
    |--------------------------------------------------------------------------
    | Initial payment record
    |--------------------------------------------------------------------------
    */

    const gateway = getActiveGateway();

    const txnRefNo = genTxnRefNo();

    const {
      error: paymentErr
    } = await supabase
      .from('payments')
      .insert({
        org_id: org.id,
        plan: planConfig.key,
        amount: planConfig.price,
        currency: planConfig.currency,
        method: gateway.name,
        gateway: gateway.name,
        status: 'Pending',
        txn_ref_no: txnRefNo,
        org_snapshot_plan: planConfig.key,
        initiated_by: adminUser.id
      });

    if (paymentErr) {
      console.error(
        '[authController] Failed to create initial payment record:',
        paymentErr.message
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Billing events
    |--------------------------------------------------------------------------
    */

    await logBillingEvent({
      orgId: org.id,
      userId: adminUser.id,
      eventType: BILLING_EVENTS.ORG_REGISTERED,
      metadata: {
        orgName,
        adminEmail: normalizedEmail
      }
    });

    await logBillingEvent({
      orgId: org.id,
      userId: adminUser.id,
      eventType: BILLING_EVENTS.PLAN_SELECTED,
      amount: planConfig.price,
      currency: planConfig.currency,
      newStatus: 'TrialPending',
      metadata: {
        plan: planConfig.key
      }
    });

    if (!paymentErr) {
      await logBillingEvent({
        orgId: org.id,
        userId: adminUser.id,
        eventType:
          BILLING_EVENTS.PAYMENT_REQUEST_CREATED,
        amount: planConfig.price,
        currency: planConfig.currency,
        txnRefNo,
        gateway: gateway.name,
        metadata: {
          plan: planConfig.key
        }
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,
      orgId: org.id,
      plan: planConfig.key,
      amountDue: planConfig.price
    });

  } catch (error) {
    console.error(
      '[registerOrganization] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/register-staff
|--------------------------------------------------------------------------
| body:
| {
|   fullName,
|   email,
|   password,
|   role,
|   orgId
| }
|--------------------------------------------------------------------------
*/

const registerStaff = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      orgId
    } = req.body;

    if (
      !fullName ||
      !email ||
      !password ||
      !role ||
      !orgId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all fields.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Email validation
    |--------------------------------------------------------------------------
    */

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: EMAIL_MESSAGE
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Role validation
    |--------------------------------------------------------------------------
    */

    if (!SELF_REGISTERABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role selected.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Password validation
    |--------------------------------------------------------------------------
    */

    if (!STAFF_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        error: STAFF_PASSWORD_MESSAGE
      });
    }

    if (!isValidPasswordLength(password)) {
      return res.status(400).json({
        success: false,
        error: PASSWORD_LENGTH_MESSAGE
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Check organization
    |--------------------------------------------------------------------------
    */

    const {
      data: org,
      error: orgError
    } = await supabase
      .from('organizations')
      .select('id, status')
      .eq('id', orgId)
      .maybeSingle();

    if (orgError) {
      console.error(
        '[registerStaff] Organization lookup failed:',
        orgError.message
      );

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    if (!org || org.status !== 'Active') {
      return res.status(400).json({
        success: false,
        error:
          'Please select a currently active organization.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check existing user
    |--------------------------------------------------------------------------
    */

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      console.error(
        '[registerStaff] Existing-user check failed:',
        existingError.message
      );

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash password
    |--------------------------------------------------------------------------
    */

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    /*
    |--------------------------------------------------------------------------
    | Create staff user
    |--------------------------------------------------------------------------
    */

    const { error } = await supabase
      .from('users')
      .insert({
        full_name: fullName,
        email: normalizedEmail,
        password_hash: passwordHash,
        role,
        org_id: orgId,
        status: 'Pending'
      });

    if (error) {
      console.error(
        '[registerStaff] User creation failed:',
        error.message
      );

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    return res.json({
      success: true
    });

  } catch (error) {
    console.error(
      '[registerStaff] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/change-password
|--------------------------------------------------------------------------
| Protected route
| body: { currentPassword, newPassword }
|--------------------------------------------------------------------------
*/

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error:
          'Please provide your current and new password.'
      });
    }

    if (
      newPassword.length < 6 ||
      newPassword.length > 8
    ) {
      return res.status(400).json({
        success: false,
        error:
          'New password must be between 6 and 8 characters.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get current user
    |--------------------------------------------------------------------------
    */

    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify current password
    |--------------------------------------------------------------------------
    */

  const match = await bcrypt.compare(
  password,
  user.password_hash
);

console.log('[login debug]', {
  email: normalizedEmail,
  role: user.role,
  status: user.status,
  passwordMatch: match
});



    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update password
    |--------------------------------------------------------------------------
    */

    const newHash = await bcrypt.hash(
      newPassword,
      10
    );

    const {
      error: updateErr
    } = await supabase
      .from('users')
      .update({
        password_hash: newHash
      })
      .eq('id', user.id);

    if (updateErr) {
      return res.status(500).json({
        success: false,
        error:
          'Could not update password. Please try again.'
      });
    }

    return res.json({
      success: true,
      message: 'Password updated successfully.'
    });

  } catch (error) {
    console.error(
      '[changePassword] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Could not update password. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/auth/me
|--------------------------------------------------------------------------
| Protected
|--------------------------------------------------------------------------
*/

const me = async (req, res) => {
  try {
    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    return res.json({
      success: true,
      user: serializeUser(user)
    });

  } catch (error) {
    console.error(
      '[me] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/forgot-password
|--------------------------------------------------------------------------
| body: { email }
|--------------------------------------------------------------------------
*/

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we've sent a password reset link to it.";

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your email address.'
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Email validation
  |--------------------------------------------------------------------------
  */

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: EMAIL_MESSAGE
    });
  }

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Per-email cooldown
  |--------------------------------------------------------------------------
  */

  const lastAttempt =
    forgotPasswordAttempts.get(normalizedEmail);

  if (
    lastAttempt &&
    Date.now() - lastAttempt <
      FORGOT_PASSWORD_COOLDOWN_MS
  ) {
    return res.json({
      success: true,
      message:
        GENERIC_FORGOT_PASSWORD_MESSAGE
    });
  }

  forgotPasswordAttempts.set(
    normalizedEmail,
    Date.now()
  );

  try {
    /*
    |--------------------------------------------------------------------------
    | Find user
    |--------------------------------------------------------------------------
    */

    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      throw error;
    }

    /*
    |--------------------------------------------------------------------------
    | Generate reset token
    |--------------------------------------------------------------------------
    */

    if (
      user &&
      user.status !== 'Rejected'
    ) {
      const rawToken =
        crypto.randomBytes(32).toString('hex');

      const tokenHash =
        hashToken(rawToken);

      const expiresAt = new Date(
        Date.now() + RESET_TOKEN_TTL_MS
      ).toISOString();

      /*
      |--------------------------------------------------------------------------
      | Save hashed token
      |--------------------------------------------------------------------------
      */

      const {
        error: updateErr
      } = await supabase
        .from('users')
        .update({
          reset_token_hash: tokenHash,
          reset_token_expires: expiresAt
        })
        .eq('id', user.id);

      if (updateErr) {
        throw updateErr;
      }

      /*
      |--------------------------------------------------------------------------
      | Build reset URL
      |--------------------------------------------------------------------------
      */

      const clientUrl =
        process.env.CLIENT_URL ||
        'http://localhost:5173';

      const resetUrl =
        `${clientUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;

      /*
      |--------------------------------------------------------------------------
      | Send reset email
      |--------------------------------------------------------------------------
      */

      try {
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.full_name,
          resetUrl
        });
      } catch (mailErr) {
        console.error(
          '[Forgot Password] Failed to send email:',
          mailErr.message
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Always return generic response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,
      message:
        GENERIC_FORGOT_PASSWORD_MESSAGE
    });

  } catch (err) {
    console.error(
      '[Forgot Password] error:',
      err.message
    );

    return res.json({
      success: true,
      message:
        GENERIC_FORGOT_PASSWORD_MESSAGE
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/auth/reset-password/:token/validate
|--------------------------------------------------------------------------
*/

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset link.'
      });
    }

    const tokenHash = hashToken(token);

    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select(
        'id, reset_token_expires'
      )
      .eq('reset_token_hash', tokenHash)
      .maybeSingle();

    if (error || !user) {
      return res.status(400).json({
        success: false,
        error:
          'This reset link is invalid or has already been used.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Expiration
    |--------------------------------------------------------------------------
    */

    if (
      new Date(
        user.reset_token_expires
      ).getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error:
          'This reset link has expired. Please request a new one.'
      });
    }

    return res.json({
      success: true
    });

  } catch (error) {
    console.error(
      '[validateResetToken] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/reset-password
|--------------------------------------------------------------------------
| body: { token, newPassword }
|--------------------------------------------------------------------------
*/

const resetPassword = async (req, res) => {
  try {
    const {
      token,
      newPassword
    } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error:
          'Missing reset token or new password.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Password validation
    |--------------------------------------------------------------------------
    */

    if (
      newPassword.length < 6 ||
      newPassword.length > 8
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Password must be between 6 and 8 characters.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash token
    |--------------------------------------------------------------------------
    */

    const tokenHash = hashToken(token);

    /*
    |--------------------------------------------------------------------------
    | Find user
    |--------------------------------------------------------------------------
    */

    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Server error. Please try again.'
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error:
          'This reset link is invalid or has already been used.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check expiration
    |--------------------------------------------------------------------------
    */

    if (
      new Date(
        user.reset_token_expires
      ).getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error:
          'This reset link has expired. Please request a new one.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash new password
    |--------------------------------------------------------------------------
    */

    const newHash = await bcrypt.hash(
      newPassword,
      10
    );

    /*
    |--------------------------------------------------------------------------
    | Update password + clear reset token
    |--------------------------------------------------------------------------
    */

    const {
      error: updateErr
    } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        reset_token_hash: null,
        reset_token_expires: null
      })
      .eq('id', user.id);

    if (updateErr) {
      return res.status(500).json({
        success: false,
        error:
          'Could not reset password. Please try again.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,
      message:
        'Your password has been reset. You can now log in with your new password.'
    });

  } catch (error) {
    console.error(
      '[resetPassword] Unexpected error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not reset password. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  login,
  registerOrganization,
  registerStaff,
  changePassword,
  me,
  forgotPassword,
  validateResetToken,
  resetPassword
};