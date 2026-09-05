import { asyncHandler } from '../utils/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await notificationService.listNotifications(req.query);
  res.json({ success: true, message: 'Notifications', data: { notifications: items, pagination } });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount();
  res.json({ success: true, message: 'Unread count', data: { count } });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id);
  res.json({ success: true, message: 'Notification marked as read', data: { notification } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const count = await notificationService.markAllAsRead();
  res.json({ success: true, message: 'All notifications marked as read', data: { count } });
});

export const remove = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id);
  res.json({ success: true, message: 'Notification deleted' });
});

export const removeAllRead = asyncHandler(async (req, res) => {
  const count = await notificationService.deleteAllRead();
  res.json({ success: true, message: 'Read notifications deleted', data: { count } });
});

// ---- Customer (personal) inbox ----

export const listMine = asyncHandler(async (req, res) => {
  const { items, pagination } = await notificationService.listMyNotifications(req.user._id, req.query);
  res.json({ success: true, message: 'Notifications', data: { notifications: items, pagination } });
});

export const unreadCountMine = asyncHandler(async (req, res) => {
  const count = await notificationService.getMyUnreadCount(req.user._id);
  res.json({ success: true, message: 'Unread count', data: { count } });
});

export const markReadMine = asyncHandler(async (req, res) => {
  const notification = await notificationService.markMyNotificationRead(req.user._id, req.params.id);
  res.json({ success: true, message: 'Notification marked as read', data: { notification } });
});

export const markAllReadMine = asyncHandler(async (req, res) => {
  const count = await notificationService.markAllMyNotificationsRead(req.user._id);
  res.json({ success: true, message: 'All notifications marked as read', data: { count } });
});

export const removeMine = asyncHandler(async (req, res) => {
  await notificationService.deleteMyNotification(req.user._id, req.params.id);
  res.json({ success: true, message: 'Notification deleted' });
});
