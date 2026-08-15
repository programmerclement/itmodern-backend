import { asyncHandler } from '../utils/asyncHandler.js';
import * as addressService from '../services/address.service.js';

export const list = asyncHandler(async (req, res) => {
  const addresses = await addressService.listAddresses(req.user._id);
  res.json({ success: true, message: 'Addresses', data: { addresses } });
});

export const create = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  res.status(201).json({ success: true, message: 'Address added', data: { address } });
});

export const update = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user._id, req.params.id, req.body);
  res.json({ success: true, message: 'Address updated', data: { address } });
});

export const remove = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user._id, req.params.id);
  res.json({ success: true, message: 'Address removed' });
});

export const setDefault = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.user._id, req.params.id);
  res.json({ success: true, message: 'Default address updated', data: { address } });
});
