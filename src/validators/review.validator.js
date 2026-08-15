import { body } from 'express-validator';

export const createReviewValidator = [
  body('productId').isMongoId().withMessage('A valid product is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ max: 120 }),
  body('comment').optional().trim().isLength({ max: 2000 }),
  body('images').optional().isArray(),
];

export const moderateReviewValidator = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
];
