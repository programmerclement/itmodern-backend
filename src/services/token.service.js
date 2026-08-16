import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';
import { parseDurationMs } from '../utils/parseDuration.js';

export const AUTH_COOKIE_NAME = 'token';

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    // Render (API) and Netlify (frontend) are different sites, so the cookie
    // must be sent cross-site — SameSite=None (requires Secure) in production.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseDurationMs(env.jwtExpiresIn),
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}
