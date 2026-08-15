import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addItemValidator, updateItemValidator, mergeCartValidator } from '../validators/cart.validator.js';

const router = Router();

router.use(protect);

router.get('/', cartController.getMyCart);
router.post('/items', addItemValidator, validate, cartController.addItem);
router.patch('/items/:productId', updateItemValidator, validate, cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.patch('/items/:productId/save-for-later', cartController.toggleSaveForLater);
router.post('/merge', mergeCartValidator, validate, cartController.mergeGuestCart);

export default router;
