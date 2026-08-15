import { body } from 'express-validator';
import { ORDER_STATUSES } from '../models/Order.js';

// Card payment isn't implemented — ITECPAY's card flow isn't documented in
// what we have to go on, so it stays rejected here rather than accepting an
// order the payment side can't actually process.
const SUPPORTED_PAYMENT_METHODS = ['CASH_ON_DELIVERY', 'MOBILE_MONEY'];

export const checkoutValidator = [
  body('deliveryMethod').isIn(['DELIVERY', 'PICKUP']).withMessage('Invalid delivery method'),
  body('addressId')
    .if(body('deliveryMethod').equals('DELIVERY'))
    .isMongoId()
    .withMessage('A valid delivery address is required'),
  body('paymentMethod')
    .isIn(SUPPORTED_PAYMENT_METHODS)
    .withMessage('Card payment is not available yet — choose Cash on Delivery/Pickup or Mobile Money'),
  body('customerName').trim().notEmpty().withMessage('Contact name is required'),
  body('customerPhone').trim().notEmpty().withMessage('Contact phone is required'),
  body('notes').optional().trim(),
  body('couponCode').optional().trim(),
];

export const updateStatusValidator = [
  body('status').isIn(ORDER_STATUSES).withMessage('Invalid order status'),
  body('note').optional().trim(),
];
