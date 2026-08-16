import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSecureToken, hashToken } from '../utils/secureToken.js';
import { env } from '../config/env.js';
import { sendVerificationEmail, sendWelcomeEmail, sendOtpEmail } from './email.service.js';
import { sendOtpSms } from './sms.service.js';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const googleClient = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

function isEmailIdentifier(identifier) {
  return /\S+@\S+\.\S+/.test(identifier);
}

function findUserByIdentifier(identifier, selectFields = '') {
  const query = isEmailIdentifier(identifier)
    ? { email: identifier.toLowerCase() }
    : { phone: identifier };
  return selectFields ? User.findOne(query).select(selectFields) : User.findOne(query);
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function issueEmailVerification(user) {
  const { rawToken, tokenHash } = generateSecureToken();
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();
  // Fire-and-forget, matching the rest of the codebase's notification-email
  // convention (order/payment/quotation emails) — never make the caller wait
  // on a third-party provider's round trip before the API responds.
  sendVerificationEmail(user, rawToken).catch(() => {});
}

export async function register({ name, email, phone, password }) {
  if (email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists');
    }
  }
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new ApiError(409, 'An account with this phone number already exists');
  }

  const user = new User({ name, email: email || undefined, phone });
  await user.setPassword(password);
  await user.save();

  if (email) {
    await issueEmailVerification(user);
  }

  return user;
}

export async function login({ identifier, password }) {
  const user = await findUserByIdentifier(identifier, '+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is suspended');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
}

export async function googleAuth({ credential }) {
  if (!googleClient) {
    throw new ApiError(503, 'Google Sign-In is not configured');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.google.clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google credential');
  }

  const { sub: googleId, email, given_name: givenName, family_name: familyName, picture } = payload;
  const name = `${givenName ?? ''} ${familyName ?? ''}`.trim() || 'Google User';

  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      user.isEmailVerified = true;
      if (!user.avatarUrl) user.avatarUrl = picture ?? null;
    } else {
      user = new User({
        name,
        email,
        authProvider: 'google',
        googleId,
        avatarUrl: picture ?? null,
        isEmailVerified: true,
      });
    }
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is suspended');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
}

async function issueOtp(user, identifier, purpose) {
  const code = generateOtpCode();
  user.otpCodeHash = hashToken(code);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpPurpose = purpose;
  await user.save();

  // Deliver on whichever channel the identifier actually was, not every
  // channel the account happens to have on file. Fire-and-forget — an SMS
  // gateway round trip shouldn't hold up the HTTP response (this is what
  // was causing the frontend's 15s axios timeout to trip on slow sends).
  if (isEmailIdentifier(identifier)) {
    sendOtpEmail(user, code).catch(() => {});
  } else {
    sendOtpSms(user.phone, code).catch(() => {});
  }
}

export async function requestOtp({ identifier, purpose }) {
  const user = await findUserByIdentifier(identifier);
  // Never reveal whether an account exists for this identifier.
  if (!user || user.authProvider !== 'local' || user.status !== 'active') {
    return;
  }

  await issueOtp(user, identifier, purpose);
}

async function consumeOtp(identifier, code, purpose) {
  const user = await findUserByIdentifier(identifier, '+otpCodeHash +otpExpires +otpPurpose');

  if (
    !user ||
    !user.otpCodeHash ||
    user.otpPurpose !== purpose ||
    !user.otpExpires ||
    user.otpExpires < new Date() ||
    user.otpCodeHash !== hashToken(code)
  ) {
    throw new ApiError(400, 'Invalid or expired code');
  }

  user.otpCodeHash = null;
  user.otpExpires = null;
  user.otpPurpose = null;

  return user;
}

export async function verifyOtpLogin({ identifier, code }) {
  const user = await consumeOtp(identifier, code, 'login');

  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is suspended');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
}

export async function resetPasswordWithOtp({ identifier, code, password }) {
  const user = await consumeOtp(identifier, code, 'reset');

  await user.setPassword(password);
  await user.save();

  return user;
}

export async function verifyEmail({ token }) {
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification link');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  sendWelcomeEmail(user).catch(() => {});

  return user;
}

export async function updateProfile(userId, { name, phone }) {
  const user = await User.findById(userId);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;

  await user.save();
  return user;
}

export async function resendVerificationEmail(user) {
  if (!user.email) {
    throw new ApiError(400, 'No email address on this account to verify');
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email is already verified');
  }
  await issueEmailVerification(user);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');

  if (user.authProvider !== 'local' || !user.passwordHash) {
    throw new ApiError(400, 'This account signs in with Google and has no password to change');
  }

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  await user.setPassword(newPassword);
  await user.save();
}
