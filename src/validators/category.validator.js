import { body } from 'express-validator';

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('Image URL must be valid'),
  body('parent').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid parent category'),
  body('specFields').optional().isArray().withMessage('specFields must be an array'),
  body('specFields.*.key').if(body('specFields').exists()).notEmpty().withMessage('Spec field key is required'),
  body('specFields.*.label').if(body('specFields').exists()).notEmpty().withMessage('Spec field label is required'),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
];

export const updateCategoryValidator = [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().trim(),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('Image URL must be valid'),
  body('parent').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid parent category'),
  body('specFields').optional().isArray().withMessage('specFields must be an array'),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
];
