import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkoutValidator, updateStatusValidator } from '../validators/order.validator.js';

const router = Router();

router.use(protect);

router.post('/', checkoutValidator, validate, orderController.checkout);
router.get('/', orderController.listMine);
router.get('/admin/all', authorize('admin'), orderController.adminList);
router.get('/admin/export', authorize('admin'), orderController.exportCsv);
router.get('/admin/export-pdf', authorize('admin'), orderController.exportPdf);
router.get('/:orderNumber', orderController.getByNumber);
router.patch('/:orderNumber/cancel', orderController.cancel);
router.patch(
  '/:orderNumber/status',
  authorize('admin'),
  updateStatusValidator,
  validate,
  orderController.updateStatus
);
router.patch('/:orderNumber/mark-paid', authorize('admin'), orderController.markPaymentReceived);
router.delete('/:orderNumber', authorize('admin'), orderController.remove);

export default router;
