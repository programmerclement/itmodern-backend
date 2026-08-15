import { asyncHandler } from '../utils/asyncHandler.js';
import * as serialNumberService from '../services/serialNumber.service.js';

export const add = asyncHandler(async (req, res) => {
  const record = await serialNumberService.addSerialNumber(req.body);
  res.status(201).json({ success: true, message: 'Serial number added', data: { serialNumber: record } });
});

export const listForOrder = asyncHandler(async (req, res) => {
  const records = await serialNumberService.listForOrder(req.params.orderNumber);
  res.json({ success: true, message: 'Serial numbers', data: { serialNumbers: records } });
});

export const listMine = asyncHandler(async (req, res) => {
  const records = await serialNumberService.listMine(req.user._id);
  res.json({ success: true, message: 'My warranties', data: { serialNumbers: records } });
});

export const check = asyncHandler(async (req, res) => {
  const result = await serialNumberService.checkWarranty(req.params.serialNumber);
  res.json({ success: true, message: 'Warranty status', data: result });
});

export const remove = asyncHandler(async (req, res) => {
  await serialNumberService.removeSerialNumber(req.params.id);
  res.json({ success: true, message: 'Serial number removed' });
});
