import mongoose from 'mongoose';

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: 'Home', trim: true },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

addressSchema.index({ user: 1 });

const Address = mongoose.model('Address', addressSchema);

export default Address;
