import { Router } from 'express';
import * as heroSlideController from '../controllers/heroSlide.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createHeroSlideValidator,
  updateHeroSlideValidator,
  reorderHeroSlidesValidator,
} from '../validators/heroSlide.validator.js';

const router = Router();

router.get('/', heroSlideController.list);
router.get('/all', protect, authorize('admin'), heroSlideController.listAll);

router.post('/', protect, authorize('admin'), createHeroSlideValidator, validate, heroSlideController.create);
router.post(
  '/reorder',
  protect,
  authorize('admin'),
  reorderHeroSlidesValidator,
  validate,
  heroSlideController.reorder
);
router.put('/:id', protect, authorize('admin'), updateHeroSlideValidator, validate, heroSlideController.update);
router.delete('/:id', protect, authorize('admin'), heroSlideController.remove);

export default router;
