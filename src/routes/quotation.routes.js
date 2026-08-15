import { Router } from 'express';
import * as quotationController from '../controllers/quotation.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  requestQuotationValidator,
  adminCreateQuotationValidator,
  adminUpdateQuotationValidator,
  acceptQuotationValidator,
} from '../validators/quotation.validator.js';

const router = Router();

router.use(protect);

router.post('/', requestQuotationValidator, validate, quotationController.request);
router.get('/', quotationController.listMine);

router.get('/admin/all', authorize('admin'), quotationController.adminList);
router.post('/admin', authorize('admin'), adminCreateQuotationValidator, validate, quotationController.adminCreate);
router.put(
  '/admin/:id',
  authorize('admin'),
  adminUpdateQuotationValidator,
  validate,
  quotationController.adminUpdate
);

router.get('/:quotationNumber', quotationController.getByNumber);
router.post('/:quotationNumber/accept', acceptQuotationValidator, validate, quotationController.accept);
router.patch('/:quotationNumber/decline', quotationController.decline);

export default router;
