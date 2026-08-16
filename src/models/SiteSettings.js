import mongoose from 'mongoose';

const { Schema } = mongoose;

const siteSettingsSchema = new Schema(
  {
    contactPhone: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true },
    contactAddress: { type: String, default: '', trim: true },

    // When false, checkout hides the ITECPAY-powered mobile money option and
    // shows these pay-to details instead — the customer pays directly and an
    // admin confirms receipt from the order detail page.
    onlinePaymentEnabled: { type: Boolean, default: true },
    momoNumber: { type: String, default: '', trim: true },
    momoName: { type: String, default: '', trim: true },
    bankName: { type: String, default: '', trim: true },
    bankAccountName: { type: String, default: '', trim: true },
    bankAccountNumber: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
