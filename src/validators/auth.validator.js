import { body } from 'express-validator';

const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long');

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('phone').trim().notEmpty().isMobilePhone('any').withMessage('A valid phone number is required'),
  passwordRule,
];

export const loginValidator = [
  body('identifier').trim().notEmpty().withMessage('Email or phone number is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const requestOtpValidator = [
  body('identifier').trim().notEmpty().withMessage('Email or phone number is required'),
  body('purpose').isIn(['login', 'reset']).withMessage('Invalid purpose'),
];

export const verifyOtpLoginValidator = [
  body('identifier').trim().notEmpty().withMessage('Email or phone number is required'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code'),
];

export const resetPasswordOtpValidator = [
  body('identifier').trim().notEmpty().withMessage('Email or phone number is required'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code'),
  passwordRule,
];

export const googleAuthValidator = [
  body('credential').notEmpty().withMessage('Google credential is required'),
];

export const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  // Phone is the account's login identifier and stays fixed after signup;
  // email is the one editable contact field here.
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

export const changePasswordValidator = [
  // Only required when the account already has a password to verify —
  // e.g. a Google account adding a password for the first time has none yet.
  body('currentPassword').optional({ values: 'falsy' }).isString(),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
];
