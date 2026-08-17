import mongoose from 'mongoose';

const { Schema } = mongoose;

const momoAccountSchema = new Schema(
  {
    label: { type: String, default: '', trim: true },
    number: { type: String, default: '', trim: true },
    name: { type: String, default: '', trim: true },
    // MTN's merchant/agent "pay by code" USSD short code — when set, the
    // checkout/order pages build a ready-to-dial *182*8*1*<code>*<amount>#
    // string for the customer to copy, with the actual order amount filled in.
    merchantCode: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const bankAccountSchema = new Schema(
  {
    bankName: { type: String, default: '', trim: true },
    accountName: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema(
  {
    contactPhone: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true },
    contactAddress: { type: String, default: '', trim: true },

    // When false, checkout hides the ITECPAY-powered mobile money option and
    // shows these pay-to accounts instead — the customer pays directly and an
    // admin confirms receipt from the order detail page.
    onlinePaymentEnabled: { type: Boolean, default: true },
    momoAccounts: { type: [momoAccountSchema], default: [] },
    bankAccounts: { type: [bankAccountSchema], default: [] },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
