import { body } from 'express-validator';

export const updateUserStatusValidator = [
  body('status').isIn(['active', 'suspended']).withMessage('Status must be active or suspended'),
];
