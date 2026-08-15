import mongoose from 'mongoose';

const { Schema } = mongoose;

const quotationItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

export const QUOTATION_STATUSES = ['REQUESTED', 'QUOTED', 'ACCEPTED', 'DECLINED', 'EXPIRED'];

const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, uppercase: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    companyName: { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    contactPhone: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true },

    items: { type: [quotationItemSchema], default: [] },
    notes: { type: String, default: '', trim: true },
    adminNotes: { type: String, default: '', trim: true },

    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    validUntil: { type: Date, default: null },
    status: { type: String, enum: QUOTATION_STATUSES, default: 'REQUESTED' },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true }
);

quotationSchema.index({ quotationNumber: 1 }, { unique: true });
quotationSchema.index({ customer: 1 });
quotationSchema.index({ status: 1 });

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
