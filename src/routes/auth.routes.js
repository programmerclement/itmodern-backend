import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import {
  registerValidator,
  loginValidator,
  requestOtpValidator,
  verifyOtpLoginValidator,
  resetPasswordOtpValidator,
  googleAuthValidator,
  changePasswordValidator,
  updateProfileValidator,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/google', authLimiter, googleAuthValidator, validate, authController.googleAuth);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.me);
router.patch('/me', protect, updateProfileValidator, validate, authController.updateProfile);

router.post('/otp/request', authLimiter, requestOtpValidator, validate, authController.requestOtp);
router.post('/otp/login', authLimiter, verifyOtpLoginValidator, validate, authController.verifyOtpLogin);
router.post(
  '/otp/reset-password',
  authLimiter,
  resetPasswordOtpValidator,
  validate,
  authController.resetPasswordWithOtp
);

router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', protect, authLimiter, authController.resendVerification);

router.post(
  '/change-password',
  protect,
  changePasswordValidator,
  validate,
  authController.changePassword
);

export default router;
