import Quotation from '../models/Quotation.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { reserveStock } from './order.service.js';
import { getOwnedAddressOrThrow } from './address.service.js';
import { sendQuotationReadyEmail } from './email.service.js';
import { createNotification } from './notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSequentialNumber } from '../utils/sequentialNumber.js';

function generateQuotationNumber() {
  return generateSequentialNumber(Quotation, 'quotationNumber', 'QT');
}

function computeItemSubtotal(unitPrice, quantity, discountPercent = 0) {
  return Math.round(unitPrice * quantity * (1 - discountPercent / 100));
}

export async function requestQuotation(user, { items, companyName, contactPerson, contactPhone, notes }) {
  if (!items?.length) {
    throw new ApiError(400, 'At least one product is required');
  }

  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const quotationItems = items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) throw new ApiError(400, 'One of the selected products could not be found');

    const quantity = Number(item.quantity) || 1;
    const subtotal = computeItemSubtotal(product.price, quantity);

    return {
      product: product._id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice: product.price,
      discountPercent: 0,
      subtotal,
    };
  });

  const subtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0);

  const quotationNumber = await generateQuotationNumber();

  const quotation = await Quotation.create({
    quotationNumber,
    customer: user._id,
    companyName,
    contactPerson,
    contactPhone,
    contactEmail: user.email,
    items: quotationItems,
    notes,
    subtotal,
    total: subtotal,
    status: 'REQUESTED',
  });

  createNotification({
    type: 'QUOTATION_REQUESTED',
    title: `New quotation request ${quotationNumber}`,
    message: `${companyName || contactPerson} requested a quotation for ${quotationItems.length} item(s)`,
    link: `/admin/quotations/${quotationNumber}`,
    meta: { quotationId: quotation._id.toString() },
  }).catch(() => {});

  return quotation;
}

export async function adminCreateQuotation(admin, payload) {
  const { customerId, items, companyName, contactPerson, contactPhone, contactEmail, tax = 0, deliveryFee = 0, validUntil, adminNotes } = payload;

  const customer = await User.findById(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const quotationItems = items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) throw new ApiError(400, 'One of the selected products could not be found');

    const quantity = Number(item.quantity) || 1;
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : product.price;
    const discountPercent = Number(item.discountPercent) || 0;
    const subtotal = computeItemSubtotal(unitPrice, quantity, discountPercent);

    return { product: product._id, name: product.name, sku: product.sku, quantity, unitPrice, discountPercent, subtotal };
  });

  const subtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal + Number(tax) + Number(deliveryFee);

  const quotationNumber = await generateQuotationNumber();

  const quotation = await Quotation.create({
    quotationNumber,
    customer: customer._id,
    companyName,
    contactPerson,
    contactPhone,
    contactEmail: contactEmail || customer.email,
    items: quotationItems,
    subtotal,
    tax,
    deliveryFee,
    total,
    validUntil: validUntil || null,
    adminNotes,
    status: 'QUOTED',
  });

  sendQuotationReadyEmail(customer, quotation).catch(() => {});
  createNotification({
    type: 'QUOTATION_READY',
    title: `Your quotation ${quotationNumber} is ready`,
    message: `Total: ${total.toLocaleString()} RWF`,
    link: `/account/quotations/${quotationNumber}`,
    userId: customer._id,
  }).catch(() => {});

  return quotation;
}

export async function adminUpdateQuotation(id, payload) {
  const quotation = await Quotation.findById(id);
  if (!quotation) throw new ApiError(404, 'Quotation not found');

  const { items, tax, deliveryFee, validUntil, adminNotes } = payload;

  if (items?.length) {
    const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });
    const productById = new Map(products.map((p) => [p._id.toString(), p]));

    quotation.items = items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new ApiError(400, 'One of the selected products could not be found');

      const quantity = Number(item.quantity) || 1;
      const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : product.price;
      const discountPercent = Number(item.discountPercent) || 0;

      return {
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        discountPercent,
        subtotal: computeItemSubtotal(unitPrice, quantity, discountPercent),
      };
    });
  }

  if (tax !== undefined) quotation.tax = Number(tax);
  if (deliveryFee !== undefined) quotation.deliveryFee = Number(deliveryFee);
  if (validUntil !== undefined) quotation.validUntil = validUntil || null;
  if (adminNotes !== undefined) quotation.adminNotes = adminNotes;

  quotation.subtotal = quotation.items.reduce((sum, item) => sum + item.subtotal, 0);
  quotation.total = quotation.subtotal + quotation.tax + quotation.deliveryFee;
  quotation.status = 'QUOTED';

  await quotation.save();

  const customer = await User.findById(quotation.customer);
  if (customer) {
    sendQuotationReadyEmail(customer, quotation).catch(() => {});
    createNotification({
      type: 'QUOTATION_READY',
      title: `Your quotation ${quotation.quotationNumber} was updated`,
      message: `Total: ${quotation.total.toLocaleString()} RWF`,
      link: `/account/quotations/${quotation.quotationNumber}`,
      userId: customer._id,
    }).catch(() => {});
  }

  return quotation;
}

export async function getQuotationByNumber(quotationNumber, requester) {
  const quotation = await Quotation.findOne({ quotationNumber: quotationNumber.toUpperCase() });
  if (!quotation) throw new ApiError(404, 'Quotation not found');

  if (requester.role !== 'admin' && quotation.customer.toString() !== requester._id.toString()) {
    throw new ApiError(403, 'You do not have access to this quotation');
  }

  return quotation;
}

export async function listMine(userId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Quotation.find({ customer: userId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Quotation.countDocuments({ customer: userId }),
  ]);

  return { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } };
}

export async function adminListAll({ status, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { quotationNumber: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { contactEmail: { $regex: search, $options: 'i' } },
      { contactPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Quotation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('customer', 'name email'),
    Quotation.countDocuments(filter),
  ]);

  return { items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } };
}

export async function acceptQuotation(quotationNumber, user, payload) {
  const quotation = await getQuotationByNumber(quotationNumber, user);

  if (quotation.status !== 'QUOTED') {
    throw new ApiError(400, `Quotation cannot be accepted while it is ${quotation.status.toLowerCase()}`);
  }
  if (quotation.validUntil && new Date() > quotation.validUntil) {
    quotation.status = 'EXPIRED';
    await quotation.save();
    throw new ApiError(400, 'This quotation has expired');
  }

  const { deliveryMethod, addressId, paymentMethod, customerName, customerPhone } = payload;

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

  const products = await Product.find({ _id: { $in: quotation.items.map((i) => i.product) } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const reserveItems = quotation.items.map((item) => ({
    product: { _id: item.product, name: item.name },
    quantity: item.quantity,
  }));

  await reserveStock(reserveItems);

  const orderItems = quotation.items.map((item) => ({
    product: item.product,
    name: item.name,
    sku: item.sku,
    image: productById.get(item.product.toString())?.images?.[0]?.url ?? null,
    price: Math.round(item.unitPrice * (1 - item.discountPercent / 100)),
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));

  let order;
  try {
    const orderNumber = await generateSequentialNumber(Order, 'orderNumber', 'ITM');
    order = await Order.create({
      orderNumber,
      user: user._id,
      items: orderItems,
      deliveryMethod,
      address: addressSnapshot,
      customerName,
      customerEmail: user.email,
      customerPhone,
      notes: `Created from accepted quotation ${quotation.quotationNumber}`,
      subtotal: quotation.subtotal,
      deliveryFee: quotation.deliveryFee,
      total: quotation.total,
      paymentMethod,
      paymentStatus: 'PENDING',
      status: 'PENDING',
      statusHistory: [
        { status: 'PENDING', note: `Order created from accepted quotation ${quotation.quotationNumber}` },
      ],
    });
  } catch (error) {
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stockQuantity: item.quantity, salesCount: -item.quantity } }
      );
    }
    throw error;
  }

  quotation.status = 'ACCEPTED';
  quotation.order = order._id;
  await quotation.save();

  createNotification({
    type: 'ORDER_PLACED',
    title: `New order ${order.orderNumber}`,
    message: `${customerName} accepted quotation ${quotation.quotationNumber} — order for ${order.total.toLocaleString()} RWF`,
    link: `/admin/orders/${order.orderNumber}`,
    meta: { orderId: order._id.toString() },
  }).catch(() => {});

  return order;
}

export async function declineQuotation(quotationNumber, user) {
  const quotation = await getQuotationByNumber(quotationNumber, user);

  if (!['REQUESTED', 'QUOTED'].includes(quotation.status)) {
    throw new ApiError(400, `Quotation cannot be declined while it is ${quotation.status.toLowerCase()}`);
  }

  quotation.status = 'DECLINED';
  await quotation.save();

  return quotation;
}
