import { body } from 'express-validator';
import { PAYMENT_METHODS } from '../models/Receipt.js';

export const createReceiptValidator = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('customerPhone').optional({ values: 'falsy' }).trim(),
  body('customerEmail').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email address'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').trim().notEmpty().withMessage('Every item needs a name'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.productId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid product'),
  body('paymentMethod').isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  body('discount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('warrantyNote').optional({ values: 'falsy' }).trim(),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('saleType').optional().isIn(['FULL', 'CREDIT']).withMessage('Invalid sale type'),
  body('amountPaid').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid due date'),
];

export const emailReceiptValidator = [
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email address'),
];

export const recordCreditPaymentValidator = [
  body('amount').isFloat({ gt: 0 }).withMessage('Enter a valid payment amount'),
];
