import { body } from 'express-validator';

export const addItemValidator = [
  body('productId').isMongoId().withMessage('A valid product is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

export const updateItemValidator = [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be zero or more'),
];

export const mergeCartValidator = [
  body('items').isArray().withMessage('items must be an array'),
  body('items.*.productId').isMongoId().withMessage('Invalid product in cart'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity in cart'),
];
