import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AUTH_COOKIE_NAME, verifyAccessToken } from '../services/token.service.js';

function extractToken(req) {
  if (req.cookies?.[AUTH_COOKIE_NAME]) return req.cookies[AUTH_COOKIE_NAME];

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}

export const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError(401, 'Authentication required');
  }

  const payload = verifyAccessToken(token);

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is suspended');
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  next();
};
