import { Router } from 'express';
import * as couponController from '../controllers/coupon.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateCouponValidator, createCouponValidator, updateCouponValidator } from '../validators/coupon.validator.js';

const router = Router();

router.post('/validate', validateCouponValidator, validate, couponController.validate);

router.use(protect, authorize('admin'));

router.get('/', couponController.list);
router.post('/', createCouponValidator, validate, couponController.create);
router.put('/:id', updateCouponValidator, validate, couponController.update);
router.delete('/:id', couponController.remove);

export default router;
