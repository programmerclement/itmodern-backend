import { asyncHandler } from '../utils/asyncHandler.js';
import * as reviewService from '../services/review.service.js';

export const canReview = asyncHandler(async (req, res) => {
  const result = await reviewService.canReview(req.user._id, req.params.productId);
  res.json({ success: true, message: 'Review eligibility', data: result });
});

export const create = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.body);
  res.status(201).json({
    success: true,
    message: 'Review submitted — it will appear once approved',
    data: { review },
  });
});

export const listForProduct = asyncHandler(async (req, res) => {
  const { items, pagination } = await reviewService.listForProduct(req.params.productId, req.query);
  res.json({ success: true, message: 'Reviews', data: { reviews: items, pagination } });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, pagination } = await reviewService.adminListReviews(req.query);
  res.json({ success: true, message: 'Reviews', data: { reviews: items, pagination } });
});

export const moderate = asyncHandler(async (req, res) => {
  const review = await reviewService.moderateReview(req.params.id, req.body.status);
  res.json({ success: true, message: 'Review updated', data: { review } });
});
