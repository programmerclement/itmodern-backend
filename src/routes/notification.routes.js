import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Customer-facing — any authenticated user, scoped to their own notifications.
router.get('/mine', protect, notificationController.listMine);
router.get('/mine/unread-count', protect, notificationController.unreadCountMine);
router.patch('/mine/read-all', protect, notificationController.markAllReadMine);
router.patch('/mine/:id/read', protect, notificationController.markReadMine);
router.delete('/mine/:id', protect, notificationController.removeMine);

// Admin — shared feed.
router.use(protect, authorize('admin'));

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.delete('/read', notificationController.removeAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.remove);

export default router;
