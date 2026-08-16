import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    // No default here deliberately (same reasoning as googleId below): leaving
    // this field entirely absent for accounts created without an email is
    // what lets the sparse unique index allow more than one emailless account.
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // Required for local signups (the primary identifier); Google-provisioned
    // accounts don't get a phone number from Google's ID token, so they're
    // exempt. No default, for the same sparse-index reason as email/googleId.
    phone: {
      type: String,
      trim: true,
      required: function isPhoneRequired() {
        return this.authProvider === 'local';
      },
    },
    passwordHash: {
      type: String,
      select: false,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    // No default here deliberately: leaving this field entirely absent for
    // local-auth users (rather than present-with-value-null) is what lets
    // the sparse unique index below allow more than one non-Google account.
    // A `default: null` would set the field on every document, and a sparse
    // index does NOT treat "present but null" as absent — every local user
    // would collide on the same null value after the second registration.
    googleId: {
      type: String,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },

    // Shared one-time-code fields, reused for both OTP login and OTP-based
    // password reset. `otpPurpose` disambiguates the two so a code issued
    // for one can't be replayed against the other.
    otpCodeHash: { type: String, select: false, default: null },
    otpExpires: { type: Date, select: false, default: null },
    otpPurpose: { type: String, select: false, default: null },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 12);
};

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    role: this.role,
    status: this.status,
    authProvider: this.authProvider,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

export default User;
