import mongoose from 'mongoose';

const { Schema } = mongoose;

const siteSettingsSchema = new Schema(
  {
    contactPhone: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true },
    contactAddress: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
