import SerialNumber from '../models/SerialNumber.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

function addWarrantyDuration(startDate, duration, unit) {
  if (!duration || !unit) return null;
  const end = new Date(startDate);
  if (unit === 'days') end.setDate(end.getDate() + duration);
  else if (unit === 'months') end.setMonth(end.getMonth() + duration);
  else if (unit === 'years') end.setFullYear(end.getFullYear() + duration);
  return end;
}

export async function addSerialNumber({ orderNumber, productId, serialNumber, notes }) {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const item = order.items.find((i) => i.product.toString() === productId);
  if (!item) {
    throw new ApiError(400, 'This product is not part of the given order');
  }

  const product = await Product.findById(productId).select('sku warranty');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const purchaseDate = order.createdAt;
  const warrantyStart = purchaseDate;
  const warrantyEnd = addWarrantyDuration(warrantyStart, product.warranty?.duration, product.warranty?.unit);

  return SerialNumber.create({
    product: productId,
    sku: product.sku,
    serialNumber: serialNumber.toUpperCase(),
    order: order._id,
    user: order.user,
    purchaseDate,
    warrantyStart,
    warrantyEnd,
    notes,
  });
}

export async function listForOrder(orderNumber) {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() }).select('_id');
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  return SerialNumber.find({ order: order._id }).sort({ createdAt: -1 });
}

export async function listMine(userId) {
  return SerialNumber.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('product', 'name slug images');
}

export async function checkWarranty(serialNumberValue) {
  const record = await SerialNumber.findOne({ serialNumber: serialNumberValue.toUpperCase() }).populate(
    'product',
    'name slug images'
  );
  if (!record) {
    throw new ApiError(404, 'No product found with this serial number');
  }

  const daysRemaining =
    record.warrantyEnd && record.status === 'ACTIVE'
      ? Math.ceil((record.warrantyEnd - new Date()) / (24 * 60 * 60 * 1000))
      : 0;

  return {
    serialNumber: record.serialNumber,
    product: record.product,
    status: record.status,
    purchaseDate: record.purchaseDate,
    warrantyStart: record.warrantyStart,
    warrantyEnd: record.warrantyEnd,
    daysRemaining,
  };
}

export async function removeSerialNumber(id) {
  const record = await SerialNumber.findById(id);
  if (!record) {
    throw new ApiError(404, 'Serial number not found');
  }
  await record.deleteOne();
}
