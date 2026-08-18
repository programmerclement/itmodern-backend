import { asyncHandler } from '../utils/asyncHandler.js';
import * as receiptService from '../services/receipt.service.js';

export const create = asyncHandler(async (req, res) => {
  const receipt = await receiptService.createReceipt(req.body, req.user);
  res.status(201).json({ success: true, message: 'Receipt created', data: { receipt } });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, pagination } = await receiptService.adminListReceipts(req.query);
  res.json({ success: true, message: 'Receipts', data: { receipts: items, pagination } });
});

export const getByNumber = asyncHandler(async (req, res) => {
  const receipt = await receiptService.getReceiptByNumber(req.params.receiptNumber);
  res.json({ success: true, message: 'Receipt', data: { receipt } });
});

export const downloadPdf = asyncHandler(async (req, res) => {
  const pdf = await receiptService.generateReceiptPdf(req.params.receiptNumber);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${req.params.receiptNumber}.pdf`);
  res.send(pdf);
});

export const verify = asyncHandler(async (req, res) => {
  const result = await receiptService.verifyReceipt(req.params.receiptNumber);
  res.json({ success: true, message: 'Receipt verified', data: result });
});

export const emailReceipt = asyncHandler(async (req, res) => {
  const receipt = await receiptService.emailReceipt(req.params.receiptNumber, req.body.email);
  res.json({ success: true, message: 'Receipt emailed', data: { receipt } });
});
