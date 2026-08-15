import mongoose from 'mongoose';

const { Schema } = mongoose;

const reviewImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
  },
  { _id: false }
);

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    comment: { type: String, trim: true, maxlength: 2000, default: '' },
    images: { type: [reviewImageSchema], default: [] },
    verifiedPurchase: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
