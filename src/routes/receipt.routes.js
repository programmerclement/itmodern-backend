import { Router } from 'express';
import * as receiptController from '../controllers/receipt.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createReceiptValidator,
  emailReceiptValidator,
  recordCreditPaymentValidator,
} from '../validators/receipt.validator.js';

const router = Router();

// Public — the QR code printed on every receipt links here so anyone can
// confirm it's genuine without needing to log in.
router.get('/verify/:receiptNumber', receiptController.verify);

router.use(protect, authorize('admin'));

// Static routes must come before the /:receiptNumber param routes below,
// otherwise Express would match e.g. "stats" as a receipt number.
router.get('/stats', receiptController.stats);
router.get('/credits', receiptController.listCredits);

router.post('/', createReceiptValidator, validate, receiptController.create);
router.get('/', receiptController.adminList);
router.get('/:receiptNumber', receiptController.getByNumber);
router.get('/:receiptNumber/pdf', receiptController.downloadPdf);
router.post('/:receiptNumber/email', emailReceiptValidator, validate, receiptController.emailReceipt);
router.post(
  '/:receiptNumber/credit-payment',
  recordCreditPaymentValidator,
  validate,
  receiptController.recordCreditPayment
);
router.post('/:receiptNumber/credit-reminder', receiptController.sendCreditReminder);

export default router;
