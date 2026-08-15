import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/', dashboardController.summary);

export default router;
