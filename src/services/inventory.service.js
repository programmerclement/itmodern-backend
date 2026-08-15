import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';

export async function adjustStock(productId, { type, quantity, reason }, adminUser) {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const previousStock = product.stockQuantity;
  let delta;
  if (type === 'IN') delta = Math.abs(quantity);
  else if (type === 'OUT') delta = -Math.abs(quantity);
  else delta = quantity; // ADJUST — signed delta, sets an exact correction

  const newStock = previousStock + delta;
  if (newStock < 0) {
    throw new ApiError(400, 'Stock cannot go below zero');
  }

  product.stockQuantity = newStock;
  await product.save();

  await InventoryLog.create({
    product: product._id,
    type,
    quantityChange: delta,
    previousStock,
    newStock,
    reason,
    performedBy: adminUser._id,
  });

  return product;
}

export async function getHistory(productId, { page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    InventoryLog.find({ product: productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('performedBy', 'firstName lastName'),
    InventoryLog.countDocuments({ product: productId }),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getLowStock() {
  return Product.find({
    status: 'published',
    stockQuantity: { $gt: 0 },
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
  })
    .select('name slug sku stockQuantity lowStockThreshold images')
    .sort({ stockQuantity: 1 });
}

export async function getOutOfStock() {
  return Product.find({ status: 'published', stockQuantity: 0 })
    .select('name slug sku stockQuantity images')
    .sort({ updatedAt: -1 });
}
