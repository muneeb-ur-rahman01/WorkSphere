const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = require('../config/supabase');

const { serializeUser } = require('../utils/serializers');
const { sendPasswordResetEmail } = require('../utils/mailer');

const { getPlan } = require('../config/plans');

const {
  logBillingEvent,
  BILLING_EVENTS
} = require('../utils/billingAudit');

const { getActiveGateway } = require('../utils/paymentGateways');

const {
  recordLoginResult
} = require('../middleware/rateLimiter');

const {
  FORGOT_PASSWORD_COOLDOWN_MS
} = require('../config/security');

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const SELF_REGISTERABLE_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership'
];

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const STAFF_PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d).{8}$/;

const STAFF_PASSWORD_MESSAGE =
  'Password must be exactly 8 characters long and include at least one letter and one number.';

const PASSWORD_MAX_LENGTH = 8;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_MESSAGE =
  'Please enter a valid email address.';

const PASSWORD_LENGTH_MESSAGE =
  'Password must not exceed 8 characters.';

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we've sent a password reset link to it.";

/*
|--------------------------------------------------------------------------
| Forgot password throttle
|--------------------------------------------------------------------------
*/

const forgotPasswordAttempts = new Map();

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const genTxnRefNo = () => {
  return `T${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

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

const hashToken = (rawToken) => {
  return crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
};

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
      expiresIn:
        process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

const login = async ({
  email,
  password,
  roleDomain
}) => {
  if (!email || !password) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please enter both email and password.'
      }
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: 400,
      body: {
        success: false,
        error: EMAIL_MESSAGE
      }
    };
  }

  const normalizedEmail =
    email.trim().toLowerCase();

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

    throw new Error(
      'Server error. Please try again.'
    );
  }

  if (!user) {
    recordLoginResult(
      normalizedEmail,
      false
    );

    return {
      status: 401,
      body: {
        success: false,
        error: 'Invalid email or password.'
      }
    };
  }

  const match = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!match) {
    recordLoginResult(
      normalizedEmail,
      false
    );

    return {
      status: 401,
      body: {
        success: false,
        error: 'Invalid email or password.'
      }
    };
  }

  if (user.status === 'Pending') {
    return {
      status: 403,
      body: {
        success: false,
        error:
          'Your account is pending Admin approval.'
      }
    };
  }

  if (
    user.status === 'Suspended' ||
    user.status === 'Rejected'
  ) {
    return {
      status: 403,
      body: {
        success: false,
        error:
          'Your account access has been restricted.'
      }
    };
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
    return {
      status: 403,
      body: {
        success: false,
        error:
          'Unauthorized access to Super Admin Portal.'
      }
    };
  }

  if (
    roleDomain === 'OrgAdmin' &&
    user.role !== 'OrgAdmin'
  ) {
    return {
      status: 403,
      body: {
        success: false,
        error:
          'Unauthorized access to Organization Administration.'
      }
    };
  }

  if (
    roleDomain === 'Staff' &&
    ['SuperAdmin', 'OrgAdmin'].includes(user.role)
  ) {
    return {
      status: 403,
      body: {
        success: false,
        error:
          'Please use the Admin login page.'
      }
    };
  }

  recordLoginResult(
    normalizedEmail,
    true
  );

  const token = signToken(user);

  /*
  |--------------------------------------------------------------------------
  | Update last login
  |--------------------------------------------------------------------------
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

  return {
    status: 200,
    body: {
      success: true,
      token,
      user: serializeUser(user)
    }
  };
};

/*
|--------------------------------------------------------------------------
| Register Organization
|--------------------------------------------------------------------------
*/

const registerOrganization = async ({
  orgName,
  adminName,
  email,
  password,
  plan
}) => {
  if (
    !orgName ||
    !adminName ||
    !email ||
    !password
  ) {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'Please fill in all required fields.'
      }
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: 400,
      body: {
        success: false,
        error: EMAIL_MESSAGE
      }
    };
  }

  if (!isValidPasswordLength(password)) {
    return {
      status: 400,
      body: {
        success: false,
        error: PASSWORD_LENGTH_MESSAGE
      }
    };
  }

  const normalizedEmail =
    email.trim().toLowerCase();

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

    throw new Error(
      'Registration failed. Please try again.'
    );
  }

  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        error: 'Email already registered.'
      }
    };
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

    if (orgErr.code === '23505') {
      return {
        status: 409,
        body: {
          success: false,
          error:
            'Organization email already registered.'
        }
      };
    }

    throw new Error(
      'Registration failed. Please try again.'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Create admin user
  |--------------------------------------------------------------------------
  */

  const passwordHash =
    await bcrypt.hash(password, 10);

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

    throw new Error(
      'Registration failed. Please try again.'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Initial payment
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
      '[authService] Failed to create initial payment record:',
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
    eventType:
      BILLING_EVENTS.ORG_REGISTERED,
    metadata: {
      orgName,
      adminEmail: normalizedEmail
    }
  });

  await logBillingEvent({
    orgId: org.id,
    userId: adminUser.id,
    eventType:
      BILLING_EVENTS.PLAN_SELECTED,
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

  return {
    status: 200,
    body: {
      success: true,
      orgId: org.id,
      plan: planConfig.key,
      amountDue: planConfig.price
    }
  };
};

/*
|--------------------------------------------------------------------------
| Register Staff
|--------------------------------------------------------------------------
*/

const registerStaff = async ({
  fullName,
  email,
  password,
  role,
  orgId
}) => {
  if (
    !fullName ||
    !email ||
    !password ||
    !role ||
    !orgId
  ) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please fill in all fields.'
      }
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: 400,
      body: {
        success: false,
        error: EMAIL_MESSAGE
      }
    };
  }

  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Invalid role selected.'
      }
    };
  }

  if (!STAFF_PASSWORD_REGEX.test(password)) {
    return {
      status: 400,
      body: {
        success: false,
        error: STAFF_PASSWORD_MESSAGE
      }
    };
  }

  if (!isValidPasswordLength(password)) {
    return {
      status: 400,
      body: {
        success: false,
        error: PASSWORD_LENGTH_MESSAGE
      }
    };
  }

  const normalizedEmail =
    email.trim().toLowerCase();

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

    throw new Error(
      'Registration failed. Please try again.'
    );
  }

  if (!org || org.status !== 'Active') {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'Please select a currently active organization.'
      }
    };
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

    throw new Error(
      'Registration failed. Please try again.'
    );
  }

  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        error: 'Email already registered.'
      }
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Create staff
  |--------------------------------------------------------------------------
  */

  const passwordHash =
    await bcrypt.hash(password, 10);

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

    throw new Error(
      'Registration failed. Please try again.'
    );
  }

  return {
    status: 200,
    body: {
      success: true
    }
  };
};

/*
|--------------------------------------------------------------------------
| Change Password
|--------------------------------------------------------------------------
*/

      const changePassword = async ({
        userId,
        currentPassword,
        newPassword
      }) => {
        if (!currentPassword || !newPassword) {
          return {
            status: 400,
            body: {
              success: false,
              error: 'Please provide your current and new password.'
            }
          };
        }

        // Exactly 16 characters
        if (newPassword.length !== 16) {
          return {
            status: 400,
            body: {
              success: false,
              error: 'New password must be exactly 16 characters.'
            }
          };
        }

        const {
          data: user,
          error
        } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !user) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'User not found.'
            }
          };
        }

        const match = await bcrypt.compare(
          currentPassword,
          user.password_hash
        );

        if (!match) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Current password is incorrect.'
            }
          };
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        const {
          error: updateErr
        } = await supabase
          .from('users')
          .update({
            password_hash: newHash
          })
          .eq('id', user.id);

        if (updateErr) {
          throw new Error(
            'Could not update password. Please try again.'
          );
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'Password updated successfully.'
          }
        };
      };

/*
|--------------------------------------------------------------------------
| Get Current User
|--------------------------------------------------------------------------
*/

const getCurrentUser = async (userId) => {
  const {
    data: user,
    error
  } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return {
      status: 404,
      body: {
        success: false,
        error: 'User not found.'
      }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      user: serializeUser(user)
    }
  };
};

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/

const forgotPassword = async (email) => {
  if (!email) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please enter your email address.'
      }
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: 400,
      body: {
        success: false,
        error: EMAIL_MESSAGE
      }
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  console.log(
    '[Forgot Password] Request received for:',
    normalizedEmail
  );

  /*
  |--------------------------------------------------------------------------
  | Forgot password cooldown
  |--------------------------------------------------------------------------
  */

  const lastAttempt = forgotPasswordAttempts.get(
    normalizedEmail
  );

  if (
    lastAttempt &&
    Date.now() - lastAttempt < FORGOT_PASSWORD_COOLDOWN_MS
  ) {
    console.log(
      '[Forgot Password] Cooldown active for:',
      normalizedEmail
    );

    return {
      status: 200,
      body: {
        success: true,
        message: GENERIC_FORGOT_PASSWORD_MESSAGE
      }
    };
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
      .select('id, email, full_name, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    console.log(
      '[Forgot Password] Normalized email:',
      normalizedEmail
    );

    console.log(
      '[Forgot Password] Supabase user lookup:',
      {
        found: !!user,
        user: user
          ? {
              id: user.id,
              email: user.email,
              status: user.status
            }
          : null,
        error: error
          ? {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            }
          : null
      }
    );

    if (error) {
      console.error(
        '[Forgot Password] User lookup failed:',
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      );

      throw error;
    }

    /*
    |--------------------------------------------------------------------------
    | User not found
    |--------------------------------------------------------------------------
    */

    if (!user) {
      console.log(
        '[Forgot Password] No user found for email:',
        normalizedEmail
      );

      return {
        status: 200,
        body: {
          success: true,
          message: GENERIC_FORGOT_PASSWORD_MESSAGE
        }
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Rejected users cannot reset password
    |--------------------------------------------------------------------------
    */

    if (user.status === 'Rejected') {
      console.log(
        '[Forgot Password] User is rejected:',
        {
          id: user.id,
          email: user.email,
          status: user.status
        }
      );

      return {
        status: 200,
        body: {
          success: true,
          message: GENERIC_FORGOT_PASSWORD_MESSAGE
        }
      };
    }

    console.log(
      '[Forgot Password] Eligible user found:',
      {
        id: user.id,
        email: user.email,
        status: user.status
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Generate reset token
    |--------------------------------------------------------------------------
    */

    const rawToken =
      crypto.randomBytes(32).toString('hex');

    const tokenHash =
      hashToken(rawToken);

    const expiresAt =
      new Date(
        Date.now() + RESET_TOKEN_TTL_MS
      ).toISOString();

    console.log(
      '[Forgot Password] Reset token generated.'
    );

    /*
    |--------------------------------------------------------------------------
    | Save reset token
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
      console.error(
        '[Forgot Password] Failed to save reset token:',
        {
          message: updateErr.message,
          code: updateErr.code,
          details: updateErr.details,
          hint: updateErr.hint
        }
      );

      throw updateErr;
    }

    console.log(
      '[Forgot Password] Reset token saved successfully for user:',
      user.id
    );

    /*
    |--------------------------------------------------------------------------
    | Create reset URL
    |--------------------------------------------------------------------------
    */

    const clientUrl =
      process.env.CLIENT_URL ||
      'http://localhost:5173';

    const resetUrl =
      `${clientUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;

    console.log(
      '[Forgot Password] Reset URL generated:',
      resetUrl
    );

    /*
    |--------------------------------------------------------------------------
    | Send password reset email
    |--------------------------------------------------------------------------
    */

    console.log(
      '[Forgot Password] Calling sendPasswordResetEmail...'
    );

    try {
      const mailResult =
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.full_name,
          resetUrl
        });

      console.log(
        '[Forgot Password] Email function completed:',
        mailResult
      );

    } catch (mailErr) {
      console.error(
        '[Forgot Password] Failed to send password reset email:',
        {
          message: mailErr.message,
          code: mailErr.code,
          response: mailErr.response,
          responseCode: mailErr.responseCode,
          command: mailErr.command
        }
      );

      /*
      Do not expose email/SMTP failure to the client.
      */
    }

    /*
    |--------------------------------------------------------------------------
    | Generic success response
    |--------------------------------------------------------------------------
    */

    return {
      status: 200,
      body: {
        success: true,
        message: GENERIC_FORGOT_PASSWORD_MESSAGE
      }
    };

  } catch (error) {
    console.error(
      '[Forgot Password] Unexpected error:',
      {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        response: error.response,
        responseCode: error.responseCode
      }
    );

    /*
    Keep response generic for security.
    */

    return {
      status: 200,
      body: {
        success: true,
        message: GENERIC_FORGOT_PASSWORD_MESSAGE
      }
    };
  }
};
/*
|--------------------------------------------------------------------------
| Validate Reset Token
|--------------------------------------------------------------------------
*/

const validateResetToken = async (token) => {
  if (!token) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Invalid reset link.'
      }
    };
  }

  const tokenHash =
    hashToken(token);

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
    return {
      status: 400,
      body: {
        success: false,
        error:
          'This reset link is invalid or has already been used.'
      }
    };
  }

  if (
    new Date(
      user.reset_token_expires
    ).getTime() < Date.now()
  ) {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'This reset link has expired. Please request a new one.'
      }
    };
  }

  return {
    status: 200,
    body: {
      success: true
    }
  };
};

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

const resetPassword = async ({
  token,
  newPassword
}) => {
  if (!token || !newPassword) {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'Missing reset token or new password.'
      }
    };
  }

  if (
    newPassword.length < 6 ||
    newPassword.length > 8
  ) {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'Password must be between 6 and 8 characters.'
      }
    };
  }

  const tokenHash =
    hashToken(token);

  const {
    data: user,
    error
  } = await supabase
    .from('users')
    .select('*')
    .eq('reset_token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(
      'Server error. Please try again.'
    );
  }

  if (!user) {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'This reset link is invalid or has already been used.'
      }
    };
  }

  if (
    new Date(
      user.reset_token_expires
    ).getTime() < Date.now()
  ) {
    return {
      status: 400,
      body: {
        success: false,
        error:
          'This reset link has expired. Please request a new one.'
      }
    };
  }

  const newHash =
    await bcrypt.hash(newPassword, 10);

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
    throw new Error(
      'Could not reset password. Please try again.'
    );
  }

  return {
    status: 200,
    body: {
      success: true,
      message:
        'Your password has been reset. You can now log in with your new password.'
    }
  };
};

module.exports = {
  login,
  registerOrganization,
  registerStaff,
  changePassword,
  getCurrentUser,
  forgotPassword,
  validateResetToken,
  resetPassword
};