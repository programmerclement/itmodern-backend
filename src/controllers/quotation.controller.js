import { asyncHandler } from '../utils/asyncHandler.js';
import * as quotationService from '../services/quotation.service.js';

export const request = asyncHandler(async (req, res) => {
  const quotation = await quotationService.requestQuotation(req.user, req.body);
  res.status(201).json({ success: true, message: 'Quotation requested', data: { quotation } });
});

export const listMine = asyncHandler(async (req, res) => {
  const { items, pagination } = await quotationService.listMine(req.user._id, req.query);
  res.json({ success: true, message: 'Quotations', data: { quotations: items, pagination } });
});

export const getByNumber = asyncHandler(async (req, res) => {
  const quotation = await quotationService.getQuotationByNumber(req.params.quotationNumber, req.user);
  res.json({ success: true, message: 'Quotation', data: { quotation } });
});

export const accept = asyncHandler(async (req, res) => {
  const order = await quotationService.acceptQuotation(req.params.quotationNumber, req.user, req.body);
  res.json({ success: true, message: 'Quotation accepted — order created', data: { order } });
});

export const decline = asyncHandler(async (req, res) => {
  const quotation = await quotationService.declineQuotation(req.params.quotationNumber, req.user);
  res.json({ success: true, message: 'Quotation declined', data: { quotation } });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, pagination } = await quotationService.adminListAll(req.query);
  res.json({ success: true, message: 'Quotations', data: { quotations: items, pagination } });
});

export const adminCreate = asyncHandler(async (req, res) => {
  const quotation = await quotationService.adminCreateQuotation(req.user, req.body);
  res.status(201).json({ success: true, message: 'Quotation created', data: { quotation } });
});

export const adminUpdate = asyncHandler(async (req, res) => {
  const quotation = await quotationService.adminUpdateQuotation(req.params.id, req.body);
  res.json({ success: true, message: 'Quotation updated', data: { quotation } });
});
