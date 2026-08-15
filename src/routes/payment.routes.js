import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { initiatePaymentValidator } from '../validators/payment.validator.js';

const router = Router();

// Called by ITECPAY's servers directly — no user session, so no `protect`.
// Authenticity is instead checked against ITECPAY_WEBHOOK_SECRET when set.
router.post('/webhook', paymentController.webhook);

router.use(protect);
router.post('/initiate', authLimiter, initiatePaymentValidator, validate, paymentController.initiate);
router.get('/status/:reference', paymentController.status);
router.get('/by-order/:orderNumber', paymentController.getByOrder);
router.get('/admin/all', authorize('admin'), paymentController.adminList);
router.get('/admin/stats', authorize('admin'), paymentController.stats);

export default router;
