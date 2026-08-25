import { asyncHandler } from '../utils/asyncHandler.js';
import * as orderService from '../services/order.service.js';

export const checkout = asyncHandler(async (req, res) => {
  const order = await orderService.createOrderFromCart(req.user, req.body);
  res.status(201).json({ success: true, message: 'Order placed successfully', data: { order } });
});

export const listMine = asyncHandler(async (req, res) => {
  const { items, pagination } = await orderService.listMyOrders(req.user._id, req.query);
  res.json({ success: true, message: 'Orders', data: { orders: items, pagination } });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, pagination } = await orderService.adminListOrders(req.query);
  res.json({ success: true, message: 'Orders', data: { orders: items, pagination } });
});

export const getByNumber = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByNumber(req.params.orderNumber, req.user);
  res.json({ success: true, message: 'Order', data: { order } });
});

export const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.orderNumber, req.user);
  res.json({ success: true, message: 'Order cancelled', data: { order } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.adminUpdateStatus(req.params.orderNumber, req.body.status, req.body.note);
  res.json({ success: true, message: 'Order status updated', data: { order } });
});

export const markPaymentReceived = asyncHandler(async (req, res) => {
  const order = await orderService.adminMarkPaymentReceived(req.params.orderNumber, req.body.note);
  res.json({ success: true, message: 'Payment marked as received', data: { order } });
});

export const remove = asyncHandler(async (req, res) => {
  await orderService.adminDeleteOrder(req.params.orderNumber);
  res.json({ success: true, message: 'Order deleted' });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await orderService.exportOrdersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=orders-${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

export const exportPdf = asyncHandler(async (req, res) => {
  const pdf = await orderService.exportOrdersPdf(req.query);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=orders-${new Date().toISOString().slice(0, 10)}.pdf`);
  res.send(pdf);
});
