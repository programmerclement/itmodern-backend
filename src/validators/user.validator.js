import { body } from 'express-validator';

export const updateUserStatusValidator = [
  body('status').isIn(['active', 'suspended']).withMessage('Status must be active or suspended'),
];

export const updateUserRoleValidator = [
  body('role').isIn(['customer', 'admin']).withMessage('Role must be customer or admin'),
];

export const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email address'),
  body('phone').trim().notEmpty().isMobilePhone('any').withMessage('A valid phone number is required'),
  body('role').optional().isIn(['customer', 'admin']).withMessage('Role must be customer or admin'),
];
