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
  body('momoAccounts').optional().isArray().withMessage('Invalid mobile money accounts'),
  body('bankAccounts').optional().isArray().withMessage('Invalid bank accounts'),
];
