import User from '../models/User.js';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';

export async function listUsers({ role, status, search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
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
