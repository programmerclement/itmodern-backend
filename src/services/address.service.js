import Address from '../models/Address.js';
import { ApiError } from '../utils/ApiError.js';

export async function listAddresses(userId) {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
}

async function getOwnedAddress(userId, id) {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }
  return address;
}

async function clearOtherDefaults(userId, excludeId = null) {
  const query = { user: userId, isDefault: true };
  if (excludeId) query._id = { $ne: excludeId };
  await Address.updateMany(query, { isDefault: false });
}

export async function createAddress(userId, data) {
  const existingCount = await Address.countDocuments({ user: userId });
  const isDefault = data.isDefault || existingCount === 0;

  if (isDefault) {
    await clearOtherDefaults(userId);
  }

  return Address.create({ ...data, user: userId, isDefault });
}

export async function updateAddress(userId, id, data) {
  const address = await getOwnedAddress(userId, id);

  if (data.isDefault) {
    await clearOtherDefaults(userId, address._id);
  }

  Object.assign(address, data);
  await address.save();
  return address;
}

export async function deleteAddress(userId, id) {
  const address = await getOwnedAddress(userId, id);
  await address.deleteOne();

  if (address.isDefault) {
    const next = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
}

export async function setDefaultAddress(userId, id) {
  const address = await getOwnedAddress(userId, id);
  await clearOtherDefaults(userId, address._id);
  address.isDefault = true;
  await address.save();
  return address;
}

export async function getOwnedAddressOrThrow(userId, id) {
  return getOwnedAddress(userId, id);
}
