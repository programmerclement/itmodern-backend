import mongoose from 'mongoose';

const { Schema } = mongoose;

const serialNumberSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, default: '' },
    serialNumber: { type: String, required: true, uppercase: true, trim: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    purchaseDate: { type: Date, default: null },
    warrantyStart: { type: Date, default: null },
    warrantyEnd: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

serialNumberSchema.index({ serialNumber: 1 }, { unique: true });
serialNumberSchema.index({ product: 1 });
serialNumberSchema.index({ order: 1 });
serialNumberSchema.index({ user: 1 });

serialNumberSchema.virtual('status').get(function status() {
  if (!this.warrantyEnd) return 'NO_WARRANTY';
  return new Date() > this.warrantyEnd ? 'EXPIRED' : 'ACTIVE';
});

const SerialNumber = mongoose.model('SerialNumber', serialNumberSchema);

export default SerialNumber;
