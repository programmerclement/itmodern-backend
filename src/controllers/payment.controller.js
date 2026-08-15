import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import * as paymentService from '../services/payment.service.js';

function toClientView(payment) {
  return {
    reference: payment.reference,
    orderId: payment.order,
    network: payment.network,
    amount: payment.amount,
    status: payment.status,
    statusMessage: payment.statusMessage,
    processed: payment.processed,
    paymentTimeoutAt: payment.paymentTimeoutAt,
  };
}

export const initiate = asyncHandler(async (req, res) => {
  const payment = await paymentService.initiatePayment(req.user, req.body);
  res.status(201).json({
    success: true,
    message:
      payment.status === 'SUCCESSFUL'
        ? 'Payment completed (test mode)'
        : 'Payment initiated — check your phone to approve it.',
    data: { payment: toClientView(payment) },
  });
});

export const status = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentStatus(req.params.reference, req.user);
  res.json({ success: true, message: 'Payment status', data: { payment: toClientView(payment) } });
});

export const getByOrder = asyncHandler(async (req, res) => {
  const payment = await paymentService.getLatestPaymentForOrder(req.params.orderNumber, req.user);
  res.json({ success: true, message: 'Payment', data: { payment: toClientView(payment) } });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, pagination } = await paymentService.adminListPayments(req.query);
  res.json({ success: true, message: 'Payments', data: { payments: items, pagination } });
});

export const stats = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentStats();
  res.json({ success: true, message: 'Payment statistics', data });
});

export const webhook = asyncHandler(async (req, res) => {
  if (env.itecpay.webhookSecret) {
    const provided = req.headers['x-webhook-secret'] || req.query.secret;
    if (provided !== env.itecpay.webhookSecret) {
      throw new ApiError(401, 'Invalid webhook secret');
    }
  }

  await paymentService.handleWebhook(req.body);
  res.json({ success: true, message: 'Webhook received' });
});
