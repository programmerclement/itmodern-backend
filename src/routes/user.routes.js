import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateUserStatusValidator, updateUserRoleValidator, createUserValidator } from '../validators/user.validator.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', userController.list);
router.get('/stats', userController.stats);
router.post('/', createUserValidator, validate, userController.create);
router.get('/:id', userController.getById);
router.patch('/:id/status', updateUserStatusValidator, validate, userController.updateStatus);
router.patch('/:id/role', updateUserRoleValidator, validate, userController.updateRole);
router.post('/:id/reset-password', userController.resetPassword);
router.delete('/:id', userController.remove);

export default router;
