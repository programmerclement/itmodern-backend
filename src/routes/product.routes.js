import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createProductValidator, updateProductValidator } from '../validators/product.validator.js';

const router = Router();

router.get('/admin/all', protect, authorize('admin'), productController.adminList);
router.get('/admin/stats', protect, authorize('admin'), productController.stats);
router.get('/admin/:id', protect, authorize('admin'), productController.getById);

router.get('/', productController.list);
router.get('/:slug', productController.getBySlug);

router.post('/', protect, authorize('admin'), createProductValidator, validate, productController.create);
router.put('/:id', protect, authorize('admin'), updateProductValidator, validate, productController.update);
router.patch('/:id/publish', protect, authorize('admin'), productController.publish);
router.patch('/:id/unpublish', protect, authorize('admin'), productController.unpublish);
router.patch('/:id/archive', protect, authorize('admin'), productController.archive);
router.patch('/:id/feature', protect, authorize('admin'), productController.toggleFeatured);

export default router;
