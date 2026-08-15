import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

async function findEligibleOrder(userId, productId) {
  return Order.findOne({
    user: userId,
    status: 'DELIVERED',
    'items.product': productId,
  }).select('_id');
}

export async function canReview(userId, productId) {
  const order = await findEligibleOrder(userId, productId);
  if (!order) {
    return { canReview: false, reason: 'You can only review products from delivered orders' };
  }

  const existing = await Review.findOne({ user: userId, product: productId, order: order._id });
  if (existing) {
    return { canReview: false, reason: 'You have already reviewed this product', existingReviewId: existing._id };
  }

  return { canReview: true, orderId: order._id };
}

export async function recalculateProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.findByIdAndUpdate(productId, {
    ratingsAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
    ratingsCount: stats?.count ?? 0,
  });
}

export async function createReview(userId, { productId, rating, title, comment, images }) {
  const eligibility = await canReview(userId, productId);
  if (!eligibility.canReview) {
    throw new ApiError(400, eligibility.reason);
  }

  const review = await Review.create({
    product: productId,
    user: userId,
    order: eligibility.orderId,
    rating,
    title,
    comment,
    images,
    verifiedPurchase: true,
    status: 'pending',
  });

  return review;
}

export async function listForProduct(productId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { product: productId, status: 'approved' };

  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'firstName lastName'),
    Review.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function adminListReviews({ status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'firstName lastName email')
      .populate('product', 'name slug'),
    Review.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function moderateReview(id, status) {
  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  review.status = status;
  await review.save();
  await recalculateProductRating(review.product);

  return review;
}
