import { body } from 'express-validator';

export const validateCouponValidator = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('subtotal').isFloat({ min: 0 }).withMessage('Invalid subtotal'),
];

export const createCouponValidator = [
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('type').isIn(['PERCENTAGE', 'FIXED']).withMessage('Type must be PERCENTAGE or FIXED'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('usageLimit').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('startDate').optional({ values: 'falsy' }).isISO8601(),
  body('endDate').optional({ values: 'falsy' }).isISO8601(),
  body('isActive').optional().isBoolean(),
];

export const updateCouponValidator = [
  body('code').optional().trim().notEmpty(),
  body('type').optional().isIn(['PERCENTAGE', 'FIXED']),
  body('value').optional().isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('usageLimit').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('startDate').optional({ values: 'falsy' }).isISO8601(),
  body('endDate').optional({ values: 'falsy' }).isISO8601(),
  body('isActive').optional().isBoolean(),
];
