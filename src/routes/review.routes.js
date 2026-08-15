import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReviewValidator, moderateReviewValidator } from '../validators/review.validator.js';

const router = Router();

router.get('/product/:productId', reviewController.listForProduct);

router.use(protect);

router.get('/can-review/:productId', reviewController.canReview);
router.post('/', createReviewValidator, validate, reviewController.create);

router.get('/admin/all', authorize('admin'), reviewController.adminList);
router.patch('/:id/status', authorize('admin'), moderateReviewValidator, validate, reviewController.moderate);

export default router;
