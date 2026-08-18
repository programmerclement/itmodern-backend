import PDFDocument from 'pdfkit';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import { getActiveCartForCheckout, clearActiveItems } from './cart.service.js';
import { getOwnedAddressOrThrow } from './address.service.js';
import { sendOrderConfirmationEmail } from './email.service.js';
import { validateCoupon, incrementUsage } from './coupon.service.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSequentialNumber } from '../utils/sequentialNumber.js';
import { toCsv } from '../utils/csv.js';
import { DELIVERY_FEE_RWF, FREE_DELIVERY_THRESHOLD_RWF } from '../constants/order.js';

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

function generateOrderNumber() {
  return generateSequentialNumber(Order, 'orderNumber', 'ITM');
}

export async function reserveStock(items) {
  const reserved = [];
  try {
    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product._id, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity, salesCount: item.quantity } },
        { new: true }
      );
      if (!updated) {
        throw new ApiError(
          409,
          `"${item.product.name}" no longer has enough stock (requested ${item.quantity})`
        );
      }
      reserved.push({ productId: item.product._id, quantity: item.quantity });
    }
    return reserved;
  } catch (error) {
    for (const item of reserved) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stockQuantity: item.quantity, salesCount: -item.quantity } }
      );
    }
    throw error;
  }
}

export async function createOrderFromCart(user, payload) {
  const { deliveryMethod, addressId, paymentMethod, notes = '', customerName, customerPhone } = payload;

  const cartItems = await getActiveCartForCheckout(user._id);
  if (!cartItems.length) {
    throw new ApiError(400, 'Your cart is empty');
  }

  for (const item of cartItems) {
    if (item.product.status !== 'published') {
      throw new ApiError(409, `"${item.product.name}" is no longer available`);
    }
  }

  let addressSnapshot = null;
  if (deliveryMethod === 'DELIVERY') {
    if (!addressId) throw new ApiError(400, 'A delivery address is required');
    const address = await getOwnedAddressOrThrow(user._id, addressId);
    addressSnapshot = {
      recipientName: address.recipientName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      street: address.street,
      notes: address.notes,
    };
  }

  const orderItems = cartItems.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    sku: item.product.sku,
    image: item.product.images?.[0]?.url ?? null,
    price: item.product.price,
    quantity: item.quantity,
    subtotal: item.product.price * item.quantity,
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee =
    deliveryMethod === 'DELIVERY' && subtotal < FREE_DELIVERY_THRESHOLD_RWF ? DELIVERY_FEE_RWF : 0;

  let coupon = null;
  let discountAmount = 0;
  if (payload.couponCode) {
    // Re-validated server-side regardless of what the client previously saw.
    ({ coupon, discountAmount } = await validateCoupon(payload.couponCode, subtotal));
  }

  const total = subtotal + deliveryFee - discountAmount;

  await reserveStock(cartItems);

  let order;
  try {
    const orderNumber = await generateOrderNumber();
    order = await Order.create({
      orderNumber,
      user: user._id,
      items: orderItems,
      deliveryMethod,
      address: addressSnapshot,
      customerName,
      customerEmail: user.email,
      customerPhone,
      notes,
      subtotal,
      deliveryFee,
      couponCode: coupon?.code ?? null,
      discountAmount,
      total,
      paymentMethod,
      paymentStatus: 'PENDING',
      status: 'PENDING',
      statusHistory: [{ status: 'PENDING', note: 'Order placed' }],
    });
  } catch (error) {
    // Order creation failed after stock was reserved — release it back.
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stockQuantity: item.quantity, salesCount: -item.quantity } }
      );
    }
    throw error;
  }

  if (coupon) {
    incrementUsage(coupon._id).catch(() => {});
  }

  await clearActiveItems(user._id);

  sendOrderConfirmationEmail(user, order).catch(() => {});

  return order;
}

export async function listMyOrders(userId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Order.countDocuments({ user: userId }),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function adminListOrders({ status, paymentStatus, user, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (user) filter.user = user;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerEmail: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name email'),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getOrderByNumber(orderNumber, requester) {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (requester.role !== 'admin' && order.user.toString() !== requester._id.toString()) {
    throw new ApiError(403, 'You do not have access to this order');
  }

  return order;
}

export async function cancelOrder(orderNumber, user) {
  const order = await getOrderByNumber(orderNumber, user);

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw new ApiError(400, `Order cannot be cancelled once it is ${order.status.toLowerCase()}`);
  }

  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stockQuantity: item.quantity, salesCount: -item.quantity } }
    );
  }

  order.status = 'CANCELLED';
  order.statusHistory.push({ status: 'CANCELLED', note: 'Cancelled by customer' });
  await order.save();

  return order;
}

export async function adminUpdateStatus(orderNumber, status, note = '') {
  if (!ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, 'Invalid order status');
  }

  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stockQuantity: item.quantity, salesCount: -item.quantity } }
      );
    }
  }

  order.status = status;
  order.statusHistory.push({ status, note });
  await order.save();

  return order;
}

// For MANUAL_TRANSFER orders (no gateway involved) — an admin confirms the
// customer actually paid to the configured momo/bank account, mirroring what
// payment.service.js's processSuccess() does for ITECPAY-confirmed payments.
export async function adminMarkPaymentReceived(orderNumber, note = '') {
  const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.paymentStatus === 'PAID') {
    throw new ApiError(400, 'This order is already marked as paid');
  }
  if (order.status === 'CANCELLED') {
    throw new ApiError(400, 'This order has been cancelled');
  }

  order.paymentStatus = 'PAID';
  if (order.status === 'PENDING') {
    order.status = 'CONFIRMED';
    order.statusHistory.push({ status: 'CONFIRMED', note: note || 'Payment received' });
  }
  await order.save();

  return order;
}

const EXPORT_COLUMNS = [
  { key: 'orderNumber', label: 'Order Number' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'customerEmail', label: 'Email' },
  { key: 'customerPhone', label: 'Phone' },
  { key: 'itemCount', label: 'Items' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'deliveryFee', label: 'Delivery Fee' },
  { key: 'discountAmount', label: 'Discount' },
  { key: 'total', label: 'Total' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'status', label: 'Order Status' },
];

async function getOrdersForExport({ startDate, endDate, status } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  return Order.find(filter).sort({ createdAt: -1 });
}

export async function exportOrdersCsv(params = {}) {
  const orders = await getOrdersForExport(params);

  const rows = orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().slice(0, 10),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discountAmount: order.discountAmount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
  }));

  return toCsv(rows, EXPORT_COLUMNS);
}

const PDF_TABLE_COLUMNS = [
  { key: 'orderNumber', label: 'Order #', width: 100 },
  { key: 'date', label: 'Date', width: 55 },
  { key: 'customerName', label: 'Customer', width: 90 },
  { key: 'paymentMethod', label: 'Payment', width: 100 },
  { key: 'status', label: 'Status', width: 70 },
  { key: 'total', label: 'Total (RWF)', width: 85 },
];

export async function exportOrdersPdf({ startDate, endDate, status } = {}) {
  const orders = await getOrdersForExport({ startDate, endDate, status });
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const buffered = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text('ITMODERN — Orders Report');
  doc.moveDown(0.3);

  const rangeLabel =
    startDate || endDate ? `${startDate || 'earliest'} to ${endDate || 'now'}` : 'All time';
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text(`Range: ${rangeLabel}${status ? ` · Status: ${status.replace(/_/g, ' ')}` : ''}`)
    .text(`Generated ${new Date().toLocaleString('en-US')}`);
  doc.moveDown(1);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f172a')
    .text(`${orders.length} order${orders.length === 1 ? '' : 's'}  ·  Total revenue: RWF ${totalRevenue.toLocaleString()}`);
  doc.moveDown(1);

  const startX = doc.page.margins.left;
  const tableWidth = PDF_TABLE_COLUMNS.reduce((sum, col) => sum + col.width, 0);
  let y = doc.y;

  // pdfkit only auto-ellipsizes text bounded by both `width` AND `height`
  // (its multi-line-paragraph truncation) — for a single-line table cell
  // that must never wrap, truncate manually before drawing without a
  // `width` option at all (passing one always triggers word-wrapping).
  const fitText = (text, maxWidth) => {
    const full = String(text ?? '');
    if (doc.widthOfString(full) <= maxWidth) return full;
    let clipped = full;
    while (clipped.length > 0 && doc.widthOfString(`${clipped}…`) > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}…`;
  };

  const drawRow = (row, { isHeader = false } = {}) => {
    let x = startX;
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(isHeader ? '#0f172a' : '#334155');
    for (const col of PDF_TABLE_COLUMNS) {
      doc.text(fitText(row[col.key], col.width - 6), x, y);
      x += col.width;
    }
    y += 18;
  };

  const drawHeaderRow = () => {
    drawRow(Object.fromEntries(PDF_TABLE_COLUMNS.map((c) => [c.key, c.label])), { isHeader: true });
    doc
      .strokeColor('#e2e8f0')
      .moveTo(startX, y - 4)
      .lineTo(startX + tableWidth, y - 4)
      .stroke();
  };

  drawHeaderRow();

  for (const order of orders) {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
    }
    drawRow({
      orderNumber: order.orderNumber,
      date: order.createdAt.toISOString().slice(0, 10),
      customerName: order.customerName,
      paymentMethod: order.paymentMethod.replace(/_/g, ' '),
      status: order.status.replace(/_/g, ' '),
      total: order.total.toLocaleString(),
    });
  }

  doc.end();
  return buffered;
}
