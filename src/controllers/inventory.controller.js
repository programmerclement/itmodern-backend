import { asyncHandler } from '../utils/asyncHandler.js';
import * as inventoryService from '../services/inventory.service.js';

export const adjust = asyncHandler(async (req, res) => {
  const product = await inventoryService.adjustStock(req.body.productId, req.body, req.user);
  res.json({ success: true, message: 'Stock updated', data: { product } });
});

export const history = asyncHandler(async (req, res) => {
  const { items, pagination } = await inventoryService.getHistory(req.params.productId, req.query);
  res.json({ success: true, message: 'Stock history', data: { logs: items, pagination } });
});

export const lowStock = asyncHandler(async (req, res) => {
  const { items, pagination } = await inventoryService.getLowStock(req.query);
  res.json({ success: true, message: 'Low stock products', data: { products: items, pagination } });
});

export const outOfStock = asyncHandler(async (req, res) => {
  const { items, pagination } = await inventoryService.getOutOfStock(req.query);
  res.json({ success: true, message: 'Out of stock products', data: { products: items, pagination } });
});
