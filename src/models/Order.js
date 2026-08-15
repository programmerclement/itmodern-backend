import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: null },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const addressSnapshotSchema = new Schema(
  {
    recipientName: { type: String, default: null },
    phone: { type: String, default: null },
    province: { type: String, default: null },
    district: { type: String, default: null },
    street: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, uppercase: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },

    deliveryMethod: { type: String, enum: ['DELIVERY', 'PICKUP'], required: true },
    address: { type: addressSnapshotSchema, default: null },

    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    notes: { type: String, default: '' },

    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    paymentMethod: { type: String, enum: ['CASH_ON_DELIVERY', 'MOBILE_MONEY', 'CARD'], required: true },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },

    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
