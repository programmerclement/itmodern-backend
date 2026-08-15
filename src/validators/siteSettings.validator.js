import { body } from 'express-validator';

export const updateSiteSettingsValidator = [
  body('contactPhone').optional({ values: 'falsy' }).trim(),
  body('contactEmail')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address'),
  body('contactAddress').optional({ values: 'falsy' }).trim(),
];
