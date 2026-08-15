import { body } from 'express-validator';

const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long');

export const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).trim().isMobilePhone('any').withMessage('Invalid phone number'),
  passwordRule,
];

export const loginValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
];

export const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  passwordRule,
];

export const googleAuthValidator = [
  body('credential').notEmpty().withMessage('Google credential is required'),
];

export const updateProfileValidator = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional({ values: 'falsy' }).trim().isMobilePhone('any').withMessage('Invalid phone number'),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
];
