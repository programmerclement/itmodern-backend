import { env } from '../config/env.js';
import Product from '../models/Product.js';
import Receipt from '../models/Receipt.js';
import { createIfNoUnreadDuplicate } from '../services/notification.service.js';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function checkLowAndOutOfStock() {
  const products = await Product.find({
    status: 'published',
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
  }).select('name stockQuantity lowStockThreshold');

  for (const product of products) {
    const isOutOfStock = product.stockQuantity <= 0;
    await createIfNoUnreadDuplicate({
      type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      title: isOutOfStock ? `"${product.name}" is out of stock` : `"${product.name}" is running low`,
      message: isOutOfStock
        ? 'No units left — restock to keep this product sellable.'
        : `Only ${product.stockQuantity} unit(s) left (threshold: ${product.lowStockThreshold}).`,
      link: `/admin/products/${product._id}`,
      meta: { productId: product._id.toString() },
    });
  }
}

async function checkOverdueCredit() {
  const overdue = await Receipt.find({
    saleType: 'CREDIT',
    balanceDue: { $gt: 0 },
    dueDate: { $ne: null, $lt: new Date() },
  }).select('receiptNumber customerName balanceDue');

  for (const receipt of overdue) {
    await createIfNoUnreadDuplicate({
      type: 'CREDIT_OVERDUE',
      title: `Credit overdue — ${receipt.receiptNumber}`,
      message: `${receipt.customerName} still owes ${receipt.balanceDue.toLocaleString()} RWF, past the due date.`,
      link: '/admin/credits',
      meta: { receiptId: receipt._id.toString() },
    });
  }
}

export function startNotificationSweep() {
  if (env.nodeEnv === 'test') return null;

  const run = async () => {
    try {
      await checkLowAndOutOfStock();
      await checkOverdueCredit();
    } catch (error) {
      console.error('[notifications] Sweep failed:', error.message);
    }
  };

  run();
  const interval = setInterval(run, SWEEP_INTERVAL_MS);
  interval.unref();
  return interval;
}
