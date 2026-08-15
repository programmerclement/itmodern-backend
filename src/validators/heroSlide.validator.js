import { body } from 'express-validator';

export const createHeroSlideValidator = [
  body('imageUrl').trim().notEmpty().withMessage('Slide image is required'),
  body('publicId').optional({ values: 'falsy' }).trim(),
  body('title').optional({ values: 'falsy' }).trim(),
  body('linkUrl').optional({ values: 'falsy' }).trim(),
  body('order').optional().isInt().withMessage('Order must be a number'),
  body('isActive').optional().isBoolean(),
];

export const updateHeroSlideValidator = [
  body('imageUrl').optional().trim().notEmpty().withMessage('Slide image cannot be empty'),
  body('publicId').optional({ values: 'falsy' }).trim(),
  body('title').optional({ values: 'falsy' }).trim(),
  body('linkUrl').optional({ values: 'falsy' }).trim(),
  body('order').optional().isInt().withMessage('Order must be a number'),
  body('isActive').optional().isBoolean(),
];

export const reorderHeroSlidesValidator = [
  body('orderedIds').isArray({ min: 1 }).withMessage('orderedIds must be a non-empty array'),
  body('orderedIds.*').isMongoId().withMessage('orderedIds must contain valid ids'),
];
