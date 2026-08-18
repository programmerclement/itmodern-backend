import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PAYMENT_METHODS = ['CASH', 'MOMO', 'AIRTEL_MONEY', 'BK', 'EQUITY_BANK', 'OTHER'];

const receiptItemSchema = new Schema(
  {
    // Set when the item was picked from stock — lets the sale be traced back
    // to a real catalog product; left null for freeform/service line items
    // (e.g. a repair charge) that aren't in the product catalog at all.
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    serialNumber: { type: String, default: '', trim: true, uppercase: true },
    unitCost: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    warrantyDuration: { type: Number, default: null, min: 0 },
    warrantyUnit: { type: String, enum: ['days', 'months', 'years', null], default: null },
  },
  { _id: false }
);

const receiptSchema = new Schema(
  {
    receiptNumber: { type: String, required: true, uppercase: true },

    customerName: { type: String, required: true, trim: true },
    // Both optional — when present, the receipt confirmation SMS/email is
    // sent automatically (phone at creation time) or on demand (email, via
    // the "Email receipt" admin action).
    customerPhone: { type: String, default: '', trim: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },

    items: { type: [receiptItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    warrantyNote: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },

    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    smsSentAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

receiptSchema.index({ receiptNumber: 1 }, { unique: true });
receiptSchema.index({ customerPhone: 1 });
receiptSchema.index({ createdAt: -1 });

const Receipt = mongoose.model('Receipt', receiptSchema);

export default Receipt;
