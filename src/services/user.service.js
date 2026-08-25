import User from '../models/User.js';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { issueOtpAllChannels } from './auth.service.js';

export async function listUsers({ role, status, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((user) => user.toSafeJSON()),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

async function getUserOrThrow(id) {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
}

export async function getUserDetail(id) {
  const user = await getUserOrThrow(id);
  const orderStats = await Order.aggregate([
    { $match: { user: user._id, paymentStatus: 'PAID' } },
    { $group: { _id: null, totalSpent: { $sum: '$total' }, orderCount: { $sum: 1 } } },
  ]);

  return {
    ...user.toSafeJSON(),
    totalSpent: orderStats[0]?.totalSpent ?? 0,
    orderCount: orderStats[0]?.orderCount ?? 0,
  };
}

export async function setUserStatus(id, status) {
  const user = await getUserOrThrow(id);
  user.status = status;
  await user.save();
  return user.toSafeJSON();
}

export async function updateUserRole(id, role) {
  const user = await getUserOrThrow(id);
  user.role = role;
  await user.save();
  return user.toSafeJSON();
}

export async function sendPasswordReset(id) {
  const user = await getUserOrThrow(id);
  if (user.authProvider !== 'local') {
    throw new ApiError(400, 'This account signs in with Google and has no password to reset');
  }
  await issueOtpAllChannels(user, 'reset');
}

export async function adminCreateUser({ name, email, phone, role }) {
  if (email) {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new ApiError(409, 'An account with this email already exists');
    }
  }
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new ApiError(409, 'An account with this phone number already exists');
  }

  const user = await User.create({
    name,
    email: email || undefined,
    phone,
    role: role || 'customer',
  });

  await issueOtpAllChannels(user, 'reset');

  return user.toSafeJSON();
}

export async function adminDeleteUser(id) {
  const user = await getUserOrThrow(id);

  const orderCount = await Order.countDocuments({ user: id });
  if (orderCount > 0) {
    throw new ApiError(409, `Cannot delete a customer with ${orderCount} order(s). Suspend the account instead.`);
  }

  await user.deleteOne();
}

export async function getUserStats() {
  const [total, active, suspended, admins, customers] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'suspended' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'customer' }),
  ]);

  return { total, active, suspended, admins, customers };
}
