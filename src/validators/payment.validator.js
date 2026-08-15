import { body } from 'express-validator';

export const initiatePaymentValidator = [
  body('orderNumber').trim().notEmpty().withMessage('Order number is required'),
  body('network').isIn(['MTN', 'AIRTEL', 'SPENN']).withMessage('Invalid network'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];
