import mongoose from 'mongoose';

const { Schema } = mongoose;

// Two audiences share this one model: ADMIN notifications feed a shared
// inbox for the (small) admin team — any admin marking one read marks it
// read for everyone. CUSTOMER notifications belong to a single `user` and
// are that person's own inbox (account page), never visible to other
// customers or mixed into the admin feed.
export const NOTIFICATION_TYPES = [
  // Admin-audience
  'ORDER_PLACED',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'REVIEW_PENDING',
  'QUOTATION_REQUESTED',
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'CREDIT_OVERDUE',
  'CUSTOMER_REGISTERED',
  // Customer-audience
  'ORDER_STATUS_UPDATED',
  'PAYMENT_CONFIRMED',
  'QUOTATION_READY',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
];

const notificationSchema = new Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    audience: { type: String, enum: ['ADMIN', 'CUSTOMER'], default: 'ADMIN' },
    // Only set (and only meaningful) for CUSTOMER-audience notifications.
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: '', trim: true },
    // Frontend route the bell dropdown navigates to on click, e.g. "/admin/orders/ORD-0001".
    link: { type: String, default: null },
    // Freeform reference data (e.g. { productId }, { receiptId }) — used by
    // the scheduled sweep to dedupe against notifications already raised for
    // the same underlying record.
    meta: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ audience: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, 'meta.productId': 1 });
notificationSchema.index({ type: 1, 'meta.receiptId': 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
