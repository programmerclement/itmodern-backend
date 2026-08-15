import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSecureToken, hashToken } from '../utils/secureToken.js';
import { env } from '../config/env.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.service.js';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

const googleClient = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

async function issueEmailVerification(user) {
  const { rawToken, tokenHash } = generateSecureToken();
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();
  await sendVerificationEmail(user, rawToken);
}

export async function register({ firstName, lastName, email, phone, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = new User({ firstName, lastName, email, phone: phone || null });
  await user.setPassword(password);
  await user.save();

  await issueEmailVerification(user);

  return user;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
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

  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      user.isEmailVerified = true;
      if (!user.avatarUrl) user.avatarUrl = picture ?? null;
    } else {
      user = new User({
        firstName: givenName || 'Google',
        lastName: familyName || 'User',
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

export async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  if (!user || user.authProvider !== 'local') {
    // Do not reveal whether the account exists, or that it's a Google-only account.
    return;
  }

  const { rawToken, tokenHash } = generateSecureToken();
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  await sendPasswordResetEmail(user, rawToken);
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset link');
  }

  await user.setPassword(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
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

  await sendWelcomeEmail(user);

  return user;
}

export async function updateProfile(userId, { firstName, lastName, phone }) {
  const user = await User.findById(userId);

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone || null;

  await user.save();
  return user;
}

export async function resendVerificationEmail(user) {
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
