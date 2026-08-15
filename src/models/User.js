import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
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

    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpires: { type: Date, select: false, default: null },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

userSchema.virtual('name').get(function computeName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

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
    firstName: this.firstName,
    lastName: this.lastName,
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
