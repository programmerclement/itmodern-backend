import { body } from 'express-validator';

export const createAddressValidator = [
  body('label').optional().trim(),
  body('recipientName').trim().notEmpty().withMessage('Recipient name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('province').trim().notEmpty().withMessage('Province is required'),
  body('district').trim().notEmpty().withMessage('District is required'),
  body('street').trim().notEmpty().withMessage('Street / detailed address is required'),
  body('notes').optional().trim(),
  body('isDefault').optional().isBoolean(),
];

export const updateAddressValidator = [
  body('label').optional().trim(),
  body('recipientName').optional().trim().notEmpty(),
  body('phone').optional().trim().notEmpty(),
  body('province').optional().trim().notEmpty(),
  body('district').optional().trim().notEmpty(),
  body('street').optional().trim().notEmpty(),
  body('notes').optional().trim(),
  body('isDefault').optional().isBoolean(),
];
