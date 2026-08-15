import { Router } from 'express';
import * as wishlistController from '../controllers/wishlist.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', wishlistController.getMyWishlist);
router.post('/:productId', wishlistController.toggle);

export default router;
