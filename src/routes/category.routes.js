import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCategoryValidator, updateCategoryValidator } from '../validators/category.validator.js';

const router = Router();

router.get('/', categoryController.list);
router.get('/all', protect, authorize('admin'), categoryController.listAll);
router.get('/:slug', categoryController.getBySlug);

router.post('/', protect, authorize('admin'), createCategoryValidator, validate, categoryController.create);
router.put('/:id', protect, authorize('admin'), updateCategoryValidator, validate, categoryController.update);
router.delete('/:id', protect, authorize('admin'), categoryController.remove);

export default router;
