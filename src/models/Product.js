import mongoose from 'mongoose';

const { Schema } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    isMain: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },

    description: { type: String, default: '', trim: true },
    shortDescription: { type: String, default: '', trim: true, maxlength: 220 },

    condition: {
      type: String,
      enum: ['NEW', 'REFURBISHED', 'USED'],
      default: 'NEW',
    },
    conditionGrade: {
      type: String,
      enum: ['A', 'B', 'C', null],
      default: null,
    },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    costPrice: { type: Number, default: null, min: 0, select: false },

    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 3, min: 0 },

    images: { type: [imageSchema], default: [] },

    specifications: { type: Map, of: Schema.Types.Mixed, default: {} },

    warranty: {
      duration: { type: Number, default: null, min: 0 },
      unit: { type: String, enum: ['days', 'months', 'years', null], default: null },
    },

    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    featured: { type: Boolean, default: false },

    tags: { type: [{ type: String, trim: true, lowercase: true }], default: [] },

    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, flattenMaps: true },
    toObject: { virtuals: true, flattenMaps: true },
  }
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ condition: 1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

productSchema.virtual('inStock').get(function inStock() {
  return this.stockQuantity > 0;
});

productSchema.virtual('isLowStock').get(function isLowStock() {
  return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

productSchema.pre('validate', function enforceConditionGrade(next) {
  if (this.condition === 'NEW') {
    this.conditionGrade = null;
  } else if (!this.conditionGrade) {
    this.invalidate('conditionGrade', 'Condition grade is required for refurbished or used products');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
