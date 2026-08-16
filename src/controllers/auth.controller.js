import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { signAccessToken, setAuthCookie, clearAuthCookie } from '../services/token.service.js';

function respondWithSession(res, statusCode, user, message) {
  const token = signAccessToken(user);
  setAuthCookie(res, token);
  res.status(statusCode).json({
    success: true,
    message,
    // The cookie is the primary session mechanism, but cross-site deployments
    // (frontend and API on different domains) can have their auth cookie
    // blocked by browser third-party-cookie protections. The token is also
    // handed back here so the client can fall back to sending it as an
    // Authorization: Bearer header, which the auth middleware already accepts.
    data: { user: user.toSafeJSON(), token },
  });
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  respondWithSession(res, 201, user, 'Account created successfully');
});

export const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  respondWithSession(res, 200, user, 'Logged in successfully');
});

export const googleAuth = asyncHandler(async (req, res) => {
  const user = await authService.googleAuth(req.body);
  respondWithSession(res, 200, user, 'Logged in successfully');
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Current user', data: { user: req.user.toSafeJSON() } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.json({ success: true, message: 'Profile updated', data: { user: user.toSafeJSON() } });
});

export const requestOtp = asyncHandler(async (req, res) => {
  await authService.requestOtp(req.body);
  res.json({
    success: true,
    message: 'If an account exists for that identifier, a code has been sent.',
  });
});

export const verifyOtpLogin = asyncHandler(async (req, res) => {
  const user = await authService.verifyOtpLogin(req.body);
  respondWithSession(res, 200, user, 'Logged in successfully');
});

export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  await authService.resetPasswordWithOtp(req.body);
  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body);
  res.json({ success: true, message: 'Email verified successfully', data: { user: user.toSafeJSON() } });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.user);
  res.json({ success: true, message: 'Verification email sent' });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  res.json({ success: true, message: 'Password changed successfully' });
});
