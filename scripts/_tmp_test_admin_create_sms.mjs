import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { adminCreateUser } from '../src/services/user.service.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected:', mongoose.connection.name);

const phone = '0799' + Math.floor(100000 + Math.random() * 900000);
const email = `test-${Date.now()}@example.com`;

const created = await adminCreateUser({
  name: 'SMS Test User',
  email,
  phone,
  role: 'customer',
});
console.log('Created user:', created.id, '| phone:', phone, '| email:', email);

// Give the fire-and-forget sendOtpSms/sendOtpEmail calls a moment to run
// and hit the real Pindo/Resend APIs before we check + clean up.
await new Promise((resolve) => setTimeout(resolve, 3000));

const user = await User.findById(created.id).select('+otpCodeHash +otpExpires +otpPurpose');
console.log('OTP was issued:', Boolean(user.otpCodeHash), '| purpose:', user.otpPurpose);

await User.deleteOne({ _id: created.id });
console.log('Cleaned up test user.');
await mongoose.disconnect();
