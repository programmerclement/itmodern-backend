import { body } from 'express-validator';

export const adjustStockValidator = [
  body('productId').isMongoId().withMessage('A valid product is required'),
  body('type').isIn(['IN', 'OUT', 'ADJUST']).withMessage('Type must be IN, OUT, or ADJUST'),
  body('quantity').isInt().withMessage('Quantity must be a whole number'),
  body('reason').trim().notEmpty().withMessage('A reason is required for every stock change'),
];
