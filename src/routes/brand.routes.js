import { Router } from 'express';
import * as brandController from '../controllers/brand.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBrandValidator, updateBrandValidator } from '../validators/brand.validator.js';

const router = Router();

router.get('/', brandController.list);
router.get('/all', protect, authorize('admin'), brandController.listAll);
router.get('/:slug', brandController.getBySlug);

router.post('/', protect, authorize('admin'), createBrandValidator, validate, brandController.create);
router.put('/:id', protect, authorize('admin'), updateBrandValidator, validate, brandController.update);
router.delete('/:id', protect, authorize('admin'), brandController.remove);

export default router;
