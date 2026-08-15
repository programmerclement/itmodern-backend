import mongoose from 'mongoose';

const { Schema } = mongoose;

const specFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'number', 'select', 'boolean'], default: 'text' },
    unit: { type: String, default: null },
    options: [{ type: String, trim: true }],
    filterable: { type: Boolean, default: false },
  },
  { _id: false }
);

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: null },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    specFields: {
      type: [specFieldSchema],
      validate: {
        validator(fields) {
          const keys = fields.map((f) => f.key);
          return new Set(keys).size === keys.length;
        },
        message: 'Specification field keys must be unique within a category',
      },
      default: [],
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
