import Coupon from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';

export async function validateCoupon(code, subtotal) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon || !coupon.isActive) {
    throw new ApiError(404, 'Invalid coupon code');
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    throw new ApiError(400, 'This coupon is not active yet');
  }
  if (coupon.endDate && now > coupon.endDate) {
    throw new ApiError(400, 'This coupon has expired');
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrderAmount) {
    throw new ApiError(400, `This coupon requires a minimum order of ${coupon.minOrderAmount} RWF`);
  }

  let discountAmount =
    coupon.type === 'PERCENTAGE' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;

  if (coupon.type === 'PERCENTAGE' && coupon.maxDiscount != null) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  }
  discountAmount = Math.min(discountAmount, subtotal);

  return { coupon, discountAmount };
}

export async function incrementUsage(couponId) {
  await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
}

export async function listCoupons() {
  return Coupon.find().sort({ createdAt: -1 });
}

export async function createCoupon(data) {
  return Coupon.create(data);
}

export async function updateCoupon(id, data) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  Object.assign(coupon, data);
  await coupon.save();
  return coupon;
}

export async function deleteCoupon(id) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  await coupon.deleteOne();
}
