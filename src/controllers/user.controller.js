import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await userService.listUsers(req.query);
  res.json({ success: true, message: 'Customers', data: { users: items, pagination } });
});

export const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserDetail(req.params.id);
  res.json({ success: true, message: 'Customer', data: { user } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const user = await userService.setUserStatus(req.params.id, req.body.status);
  res.json({ success: true, message: 'Customer status updated', data: { user } });
});
