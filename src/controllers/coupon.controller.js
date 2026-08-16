import { asyncHandler } from '../utils/asyncHandler.js';
import * as couponService from '../services/coupon.service.js';

export const validate = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const { coupon, discountAmount } = await couponService.validateCoupon(code, Number(subtotal));
  res.json({
    success: true,
    message: 'Coupon applied',
    data: { code: coupon.code, type: coupon.type, value: coupon.value, discountAmount },
  });
});

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await couponService.adminListCoupons(req.query);
  res.json({ success: true, message: 'Coupons', data: { coupons: items, pagination } });
});

export const create = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(201).json({ success: true, message: 'Coupon created', data: { coupon } });
});

export const update = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  res.json({ success: true, message: 'Coupon updated', data: { coupon } });
});

export const remove = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  res.json({ success: true, message: 'Coupon deleted' });
});
