import { body } from 'express-validator';

export const updateSiteSettingsValidator = [
  body('contactPhone').optional({ values: 'falsy' }).trim(),
  body('contactEmail')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address'),
  body('contactAddress').optional({ values: 'falsy' }).trim(),
  body('onlinePaymentEnabled').optional().isBoolean().withMessage('Invalid value'),
  body('momoNumber').optional({ values: 'falsy' }).trim(),
  body('momoName').optional({ values: 'falsy' }).trim(),
  body('bankName').optional({ values: 'falsy' }).trim(),
  body('bankAccountName').optional({ values: 'falsy' }).trim(),
  body('bankAccountNumber').optional({ values: 'falsy' }).trim(),
];
