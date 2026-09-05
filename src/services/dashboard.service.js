import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Receipt from '../models/Receipt.js';

export async function getDashboardSummary() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    revenueAgg,
    totalOrders,
    totalCustomers,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    pendingOrders,
    pendingPayments,
    totalReceipts,
    receiptRevenueByMethodAgg,
    creditOutstandingAgg,
    salesOverTime,
    bestSelling,
    revenueByCategory,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ status: { $ne: 'archived' } }),
    Product.countDocuments({
      status: 'published',
      stockQuantity: { $gt: 0 },
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }),
    Product.countDocuments({ status: 'published', stockQuantity: 0 }),
    Order.countDocuments({ status: 'PENDING' }),
    Payment.countDocuments({ status: 'PENDING' }),
    Receipt.countDocuments(),
    Receipt.aggregate([{ $group: { _id: '$paymentMethod', revenue: { $sum: '$total' } } }]),
    Receipt.aggregate([
      { $match: { saleType: 'CREDIT', balanceDue: { $gt: 0 } } },
      { $group: { _id: null, outstanding: { $sum: '$balanceDue' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Product.find({ status: { $ne: 'archived' } })
      .sort({ salesCount: -1 })
      .limit(5)
      .select('name slug salesCount price images'),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: '$productDoc' },
      { $group: { _id: '$productDoc.category', revenue: { $sum: '$items.subtotal' } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      { $unwind: '$categoryDoc' },
      { $project: { _id: 0, category: '$categoryDoc.name', revenue: 1 } },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const receiptRevenueByMethod = Object.fromEntries(
    receiptRevenueByMethodAgg.map((entry) => [entry._id, entry.revenue])
  );
  const totalReceiptRevenue = receiptRevenueByMethodAgg.reduce((sum, entry) => sum + entry.revenue, 0);

  return {
    totalRevenue: revenueAgg[0]?.total ?? 0,
    totalOrders,
    totalCustomers,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    pendingOrders,
    pendingPayments,
    totalReceipts,
    totalReceiptRevenue,
    receiptRevenueByMethod,
    creditOutstandingTotal: creditOutstandingAgg[0]?.outstanding ?? 0,
    salesOverTime,
    bestSelling,
    revenueByCategory,
  };
}
