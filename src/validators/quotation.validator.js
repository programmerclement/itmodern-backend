import { body } from 'express-validator';

export const requestQuotationValidator = [
  body('items').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
  body('companyName').optional().trim(),
  body('contactPerson').optional().trim(),
  body('contactPhone').optional().trim(),
  body('notes').optional().trim(),
];

export const adminCreateQuotationValidator = [
  body('customerId').isMongoId().withMessage('A valid customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('items.*.discountPercent').optional().isFloat({ min: 0, max: 100 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('deliveryFee').optional().isFloat({ min: 0 }),
  body('validUntil').optional().isISO8601(),
];

export const adminUpdateQuotationValidator = [
  body('items').optional().isArray(),
  body('items.*.productId').optional().isMongoId(),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('items.*.discountPercent').optional().isFloat({ min: 0, max: 100 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('deliveryFee').optional().isFloat({ min: 0 }),
  body('validUntil').optional().isISO8601(),
];

export const acceptQuotationValidator = [
  body('deliveryMethod').isIn(['DELIVERY', 'PICKUP']).withMessage('Invalid delivery method'),
  body('addressId')
    .if(body('deliveryMethod').equals('DELIVERY'))
    .isMongoId()
    .withMessage('A valid delivery address is required'),
  body('paymentMethod').isIn(['CASH_ON_DELIVERY', 'MOBILE_MONEY']).withMessage('Invalid payment method'),
  body('customerName').trim().notEmpty().withMessage('Contact name is required'),
  body('customerPhone').trim().notEmpty().withMessage('Contact phone is required'),
];
