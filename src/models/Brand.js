import mongoose from 'mongoose';

const { Schema } = mongoose;

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    logoUrl: { type: String, default: null },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    // Empty array = universal brand, shown regardless of the selected category.
    categories: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [] },
  },
  { timestamps: true }
);

brandSchema.index({ slug: 1 }, { unique: true });
brandSchema.index({ categories: 1 });

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;
