import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateUserStatusValidator } from '../validators/user.validator.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.patch('/:id/status', updateUserStatusValidator, validate, userController.updateStatus);

export default router;
