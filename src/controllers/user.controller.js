import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await userService.listUsers(req.query);
  res.json({ success: true, message: 'Customers', data: { users: items, pagination } });
});

export const stats = asyncHandler(async (req, res) => {
  const data = await userService.getUserStats();
  res.json({ success: true, message: 'Customer stats', data });
});

export const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserDetail(req.params.id);
  res.json({ success: true, message: 'Customer', data: { user } });
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.adminCreateUser(req.body);
  res.status(201).json({ success: true, message: 'Customer created', data: { user } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const user = await userService.setUserStatus(req.params.id, req.body.status);
  res.json({ success: true, message: 'Customer status updated', data: { user } });
});

export const updateRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole(req.params.id, req.body.role);
  res.json({ success: true, message: 'Customer role updated', data: { user } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await userService.sendPasswordReset(req.params.id);
  res.json({ success: true, message: 'Password reset email sent' });
});

export const remove = asyncHandler(async (req, res) => {
  await userService.adminDeleteUser(req.params.id);
  res.json({ success: true, message: 'Customer deleted' });
});
