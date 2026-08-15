import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    network: { type: String, enum: ['MTN', 'AIRTEL', 'SPENN'], required: true },

    // `reference` is the customer/UI-facing transaction id (ITECPAY's transID when
    // available, falling back to our own req_ref). `req_ref` is what we send ITECPAY
    // on the v2 (MTN/SPENN) pay+verify calls.
    reference: { type: String, required: true },
    req_ref: { type: String, required: true },
    itecpayTransactionId: { type: String, default: null },
    itecpayApiVersion: { type: String, enum: ['v1', 'v2'], required: true },

    itecpayResponse: { type: Schema.Types.Mixed, default: null },
    itecpayStatusResponse: { type: Schema.Types.Mixed, default: null },
    itecpayWebhook: { type: Schema.Types.Mixed, default: null },
    lastWebhookAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
    },
    statusMessage: { type: String, default: '' },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
    paymentTimeoutAt: { type: Date, required: true },

    // Only ever true when ITECPAY_TEST_MODE=true and network is AIRTEL — see
    // payment.service.js. Never set in a real transaction.
    testModePayment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

paymentSchema.index({ reference: 1 }, { unique: true });
paymentSchema.index({ req_ref: 1 }, { unique: true });
paymentSchema.index({ order: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
