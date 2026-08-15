import mongoose from 'mongoose';

const { Schema } = mongoose;

const heroSlideSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    publicId: { type: String, default: null },
    title: { type: String, default: '', trim: true },
    linkUrl: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

heroSlideSchema.index({ order: 1 });

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);

export default HeroSlide;
