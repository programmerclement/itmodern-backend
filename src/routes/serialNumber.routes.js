import { Router } from 'express';
import * as serialNumberController from '../controllers/serialNumber.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addSerialNumberValidator } from '../validators/serialNumber.validator.js';

const router = Router();

router.get('/check/:serialNumber', serialNumberController.check);

router.get('/mine', protect, serialNumberController.listMine);

router.post('/', protect, authorize('admin'), addSerialNumberValidator, validate, serialNumberController.add);
router.get('/order/:orderNumber', protect, authorize('admin'), serialNumberController.listForOrder);
router.delete('/:id', protect, authorize('admin'), serialNumberController.remove);

export default router;
