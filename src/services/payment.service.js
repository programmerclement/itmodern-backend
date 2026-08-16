import { randomUUID } from 'crypto';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import * as itecpay from '../integrations/payments/itecpayClient.js';
import { sendPaymentReceivedEmail } from './email.service.js';

const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;
const VALID_NETWORKS = ['MTN', 'AIRTEL', 'SPENN'];

function cleanRwandaPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('07') || digits.length !== 10) {
    throw new ApiError(400, 'Phone must be 10 digits starting with 07 (e.g. 0788123456)');
  }
  return digits;
}

async function releaseOrderStock(order) {
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stockQuantity: item.quantity, salesCount: -item.quantity } }
    );
  }
}

export async function processSuccess(payment) {
  if (payment.processed) return;

  const order = await Order.findById(payment.order);
  if (!order) return;

  payment.processed = true;
  payment.processedAt = new Date();
  payment.status = 'SUCCESSFUL';
  await payment.save();

  order.paymentStatus = 'PAID';
  if (order.status === 'PENDING') {
    order.status = 'CONFIRMED';
    order.statusHistory.push({ status: 'CONFIRMED', note: 'Payment received' });
  }
  await order.save();

  const user = await User.findById(payment.user);
  if (user) {
    sendPaymentReceivedEmail(user, order, payment).catch(() => {});
  }
}

async function failPayment(payment, message) {
  payment.status = 'FAILED';
  payment.statusMessage = message;
  await payment.save();

  const order = await Order.findById(payment.order);
  if (order && order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'FAILED';
    await order.save();
  }
}

async function expirePayment(payment, message) {
  payment.status = 'EXPIRED';
  payment.statusMessage = message;
  await payment.save();

  const order = await Order.findById(payment.order);
  if (order && order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED') {
    await releaseOrderStock(order);
    order.paymentStatus = 'FAILED';
    order.status = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      note: 'Payment window expired — order automatically cancelled and stock released.',
    });
    await order.save();
  }
}

function isTimedOut(payment, now) {
  return payment.status === 'PENDING' && payment.paymentTimeoutAt && now > payment.paymentTimeoutAt;
}

export async function initiatePayment(user, { orderNumber, network, phone }) {
  const formattedNetwork = network.toUpperCase();
  if (!VALID_NETWORKS.includes(formattedNetwork)) {
    throw new ApiError(400, `Invalid network. Must be one of: ${VALID_NETWORKS.join(', ')}`);
  }
  const cleanPhone = cleanRwandaPhone(phone);

  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase(), user: user._id });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.paymentMethod !== 'MOBILE_MONEY') {
    throw new ApiError(400, 'This order is not set up for mobile money payment');
  }
  if (order.paymentStatus === 'PAID') {
    throw new ApiError(400, 'This order has already been paid');
  }
  if (order.status === 'CANCELLED') {
    throw new ApiError(400, 'This order has been cancelled');
  }

  const existingPending = await Payment.findOne({ order: order._id, status: 'PENDING' });
  if (existingPending) {
    return existingPending;
  }

  const req_ref = randomUUID();
  const isAirtel = formattedNetwork === 'AIRTEL';
  const apiVersion = isAirtel ? 'v1' : 'v2';

  // DEV-ONLY SHORTCUT: mirrors the reference project's test mode. Only ever
  // active when ITECPAY_TEST_MODE=true, and only for AIRTEL — it skips the
  // real ITECPAY call entirely so local/staging checkouts can be exercised
  // without a real phone. MTN/SPENN always go through the real v2 API even
  // in test mode, matching the reference's behavior.
  const shouldSimulateSuccess = env.itecpay.testMode && isAirtel;
  if (env.itecpay.testMode) {
    console.warn(`[payments] ITECPAY_TEST_MODE is on — ${isAirtel ? 'simulating' : 'still placing a REAL'} ${formattedNetwork} payment.`);
  }

  let providerResponse;
  if (shouldSimulateSuccess) {
    providerResponse = { status: 200, data: { transID: `TEST-${req_ref}` } };
  } else if (isAirtel) {
    providerResponse = await itecpay.payAirtel({ amount: order.total, phone: cleanPhone });
  } else {
    providerResponse = await itecpay.payMobileMoney({
      amount: order.total,
      phone: cleanPhone,
      reqRef: req_ref,
      note: `Payment for order ${order.orderNumber}`,
      message: `Complete payment for order ${order.orderNumber}`,
    });
  }

  if (providerResponse.status !== 200) {
    throw new ApiError(400, providerResponse.message || 'Payment initiation failed', providerResponse);
  }

  const transactionId = providerResponse.data?.transID || providerResponse.data?.transaction_id || req_ref;

  const payment = await Payment.create({
    order: order._id,
    user: user._id,
    amount: order.total,
    phoneNumber: cleanPhone,
    network: formattedNetwork,
    reference: transactionId,
    req_ref,
    itecpayTransactionId: providerResponse.data?.transID || providerResponse.data?.transaction_id || null,
    itecpayApiVersion: apiVersion,
    itecpayResponse: providerResponse,
    status: shouldSimulateSuccess ? 'SUCCESSFUL' : 'PENDING',
    paymentTimeoutAt: new Date(Date.now() + PAYMENT_TIMEOUT_MS),
    testModePayment: shouldSimulateSuccess,
  });

  if (shouldSimulateSuccess) {
    await processSuccess(payment);
  }

  return payment;
}

export async function checkAndUpdatePendingPayments(payments = null) {
  let pending;

  if (payments) {
    pending = payments.filter((p) => p.status === 'PENDING');
  } else {
    const timeoutThreshold = new Date(Date.now() - PAYMENT_TIMEOUT_MS);
    pending = await Payment.find({
      status: 'PENDING',
      $or: [{ createdAt: { $lt: timeoutThreshold } }, { paymentTimeoutAt: { $lt: new Date() } }],
    });
  }

  if (!pending.length) return 0;

  const now = new Date();
  let updatedCount = 0;

  for (const payment of pending) {
    try {
      if (payment.itecpayApiVersion === 'v1') {
        // AIRTEL has no verify endpoint — confirmation only arrives via webhook.
        if (isTimedOut(payment, now)) {
          await expirePayment(
            payment,
            'Payment timed out — Airtel confirmations arrive via webhook and none was received in time.'
          );
          updatedCount += 1;
        }
        continue;
      }

      const statusResponse = await itecpay.verifyMobileMoney(payment.req_ref);

      if (statusResponse.status === 200) {
        const txStatus = (statusResponse.data?.status || statusResponse.message || '').toUpperCase();
        payment.itecpayStatusResponse = statusResponse;

        if (['SUCCESSFUL', 'COMPLETED'].includes(txStatus)) {
          payment.status = 'SUCCESSFUL';
          await payment.save();
          await processSuccess(payment);
          updatedCount += 1;
          continue;
        }

        if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(txStatus)) {
          await failPayment(payment, `ITECPAY reported: ${txStatus}`);
          updatedCount += 1;
          continue;
        }

        await payment.save();
      }

      if (isTimedOut(payment, now)) {
        await expirePayment(payment, 'Payment timed out — customer did not complete payment in time.');
        updatedCount += 1;
      }
    } catch (error) {
      console.error(`[payments] Check failed for ${payment.reference}:`, error.message);
    }
  }

  return updatedCount;
}

export async function getPaymentStatus(reference, user) {
  const payment = await Payment.findOne({ $or: [{ reference }, { req_ref: reference }] });
  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }
  if (user.role !== 'admin' && payment.user.toString() !== user._id.toString()) {
    throw new ApiError(403, 'You do not have access to this payment');
  }

  if (payment.status === 'PENDING') {
    await checkAndUpdatePendingPayments([payment]);
  }

  return Payment.findById(payment._id);
}

export async function getLatestPaymentForOrder(orderNumber, user) {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (user.role !== 'admin' && order.user.toString() !== user._id.toString()) {
    throw new ApiError(403, 'You do not have access to this order');
  }

  const payment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });
  if (!payment) {
    throw new ApiError(404, 'No payment found for this order');
  }
  return payment;
}

export async function adminListPayments({ status, network, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (network) filter.network = network;
  if (search) {
    filter.$or = [
      { reference: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name email')
      .populate('order', 'orderNumber total'),
    Payment.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getPaymentStats() {
  const [totals] = await Payment.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESSFUL'] }, '$amount', 0] } },
        totalTransactions: { $sum: 1 },
        successfulTransactions: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESSFUL'] }, 1, 0] } },
        pendingTransactions: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        failedTransactions: {
          $sum: { $cond: [{ $in: ['$status', ['FAILED', 'EXPIRED']] }, 1, 0] },
        },
      },
    },
  ]);

  const networkDistribution = await Payment.aggregate([
    { $match: { status: 'SUCCESSFUL' } },
    { $group: { _id: '$network', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
  ]);

  return {
    total: totals ?? {
      totalRevenue: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
    },
    networkDistribution,
  };
}

export async function handleWebhook(payload) {
  const transactionId = payload.transaction_id || payload.transID || payload.req_ref;
  if (!transactionId) {
    throw new ApiError(400, 'No transaction ID in webhook payload');
  }

  const payment = await Payment.findOne({
    $or: [{ reference: transactionId }, { req_ref: transactionId }],
  });
  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  payment.itecpayWebhook = payload;
  payment.lastWebhookAt = new Date();

  const rawStatus = (payload.status || payload.payment_status || payload.state || '').toUpperCase();

  if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(rawStatus) && payment.status !== 'SUCCESSFUL') {
    payment.status = 'SUCCESSFUL';
    await payment.save();
    await processSuccess(payment);
    return;
  }

  if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(rawStatus) && payment.status === 'PENDING') {
    await failPayment(payment, `ITECPAY webhook reported: ${rawStatus}`);
    return;
  }

  await payment.save();
}
