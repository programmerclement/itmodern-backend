import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../services/token.service.js';
import User from '../models/User.js';

let io = null;

const ALLOWED_ORIGINS = [
  env.frontendUrl,
  'https://itmodernltd.com',
  'https://www.itmodernltd.com',
  'https://itmodern.netlify.app',
];

// Every connected admin joins this single room — notifications are broadcast
// to it rather than to individual sockets, matching the shared-feed design
// of the Notification model itself.
const ADMIN_ROOM = 'admins';

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
  });

  // Mirrors the REST API's own auth: the client sends the same bearer token
  // it already carries as a cookie/localStorage fallback (see axiosClient.js).
  // Any active user may connect (customers included) — role only decides
  // which room(s) they additionally join, below.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active') {
        return next(new Error('Not authorized'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.user._id));
    if (socket.user.role === 'admin') socket.join(ADMIN_ROOM);
  });

  return io;
}

function userRoom(userId) {
  return `user:${userId}`;
}

// Fire-and-forget from any service — before initSocket() runs (or in tests)
// this is just a no-op rather than a hard dependency.
export function emitToAdmins(event, payload) {
  io?.to(ADMIN_ROOM).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  io?.to(userRoom(userId)).emit(event, payload);
}
