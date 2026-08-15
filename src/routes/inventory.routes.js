import { Router } from 'express';
import * as inventoryController from '../controllers/inventory.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adjustStockValidator } from '../validators/inventory.validator.js';

const router = Router();

router.use(protect, authorize('admin'));

router.post('/adjust', adjustStockValidator, validate, inventoryController.adjust);
router.get('/history/:productId', inventoryController.history);
router.get('/low-stock', inventoryController.lowStock);
router.get('/out-of-stock', inventoryController.outOfStock);

export default router;
