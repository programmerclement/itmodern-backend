import { body } from 'express-validator';

export const addSerialNumberValidator = [
  body('orderNumber').trim().notEmpty().withMessage('Order number is required'),
  body('productId').isMongoId().withMessage('A valid product is required'),
  body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
  body('notes').optional().trim(),
];
