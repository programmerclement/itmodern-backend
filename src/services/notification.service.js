import Notification from '../models/Notification.js';
import { emitToAdmins, emitToUser } from '../realtime/socket.js';

async function paginate(filter, { page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Notification.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

// userId set => a personal notification for that customer's own account-page
// inbox. userId omitted => the shared admin feed. Never both.
export async function createNotification({ type, title, message = '', link = null, meta = {}, userId = null }) {
  const notification = await Notification.create({
    type,
    title,
    message,
    link,
    meta,
    user: userId,
    audience: userId ? 'CUSTOMER' : 'ADMIN',
  });

  if (userId) emitToUser(userId, 'notification', notification);
  else emitToAdmins('notification', notification);

  return notification;
}

// Used by the scheduled sweep (low stock, out of stock, credit overdue) to
// avoid re-raising the same admin alert every sweep interval — it only fires
// again once the existing one has been marked read.
export async function createIfNoUnreadDuplicate({ type, title, message, link, meta }) {
  const metaFilter = Object.fromEntries(Object.entries(meta).map(([key, value]) => [`meta.${key}`, value]));
  const existing = await Notification.findOne({ type, audience: 'ADMIN', isRead: false, ...metaFilter });
  if (existing) return null;
  return createNotification({ type, title, message, link, meta });
}

// ---- Admin (shared) feed ----

export async function listNotifications({ isRead, page, limit } = {}) {
  const filter = { audience: 'ADMIN' };
  if (isRead !== undefined) filter.isRead = isRead === 'true' || isRead === true;
  return paginate(filter, { page, limit });
}

export async function getUnreadCount() {
  return Notification.countDocuments({ audience: 'ADMIN', isRead: false });
}

export async function markAsRead(id) {
  return Notification.findOneAndUpdate(
    { _id: id, audience: 'ADMIN' },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
}

export async function markAllAsRead() {
  const result = await Notification.updateMany(
    { audience: 'ADMIN', isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount ?? 0;
}

export async function deleteNotification(id) {
  await Notification.deleteOne({ _id: id, audience: 'ADMIN' });
}

export async function deleteAllRead() {
  const result = await Notification.deleteMany({ audience: 'ADMIN', isRead: true });
  return result.deletedCount ?? 0;
}

// ---- Customer (personal) inbox ----

export async function listMyNotifications(userId, { isRead, page, limit } = {}) {
  const filter = { user: userId };
  if (isRead !== undefined) filter.isRead = isRead === 'true' || isRead === true;
  return paginate(filter, { page, limit });
}

export async function getMyUnreadCount(userId) {
  return Notification.countDocuments({ user: userId, isRead: false });
}

export async function markMyNotificationRead(userId, id) {
  return Notification.findOneAndUpdate({ _id: id, user: userId }, { isRead: true, readAt: new Date() }, { new: true });
}

export async function markAllMyNotificationsRead(userId) {
  const result = await Notification.updateMany({ user: userId, isRead: false }, { isRead: true, readAt: new Date() });
  return result.modifiedCount ?? 0;
}

export async function deleteMyNotification(userId, id) {
  await Notification.deleteOne({ _id: id, user: userId });
}
