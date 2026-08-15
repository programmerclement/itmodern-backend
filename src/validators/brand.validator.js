import { body } from 'express-validator';

export const createBrandValidator = [
  body('name').trim().notEmpty().withMessage('Brand name is required'),
  body('description').optional().trim(),
  body('logoUrl').optional({ values: 'falsy' }).isURL().withMessage('Logo URL must be valid'),
  body('isActive').optional().isBoolean(),
];

export const updateBrandValidator = [
  body('name').optional().trim().notEmpty().withMessage('Brand name cannot be empty'),
  body('description').optional().trim(),
  body('logoUrl').optional({ values: 'falsy' }).isURL().withMessage('Logo URL must be valid'),
  body('isActive').optional().isBoolean(),
];
