import { asyncHandler } from '../utils/asyncHandler.js';
import * as brandService from '../services/brand.service.js';

export const list = asyncHandler(async (req, res) => {
  const brands = await brandService.listBrands({ activeOnly: true });
  res.json({ success: true, message: 'Brands', data: { brands } });
});

export const listAll = asyncHandler(async (req, res) => {
  const brands = await brandService.listBrands({ activeOnly: false });
  res.json({ success: true, message: 'All brands', data: { brands } });
});

export const getBySlug = asyncHandler(async (req, res) => {
  const brand = await brandService.getBrandBySlug(req.params.slug);
  res.json({ success: true, message: 'Brand', data: { brand } });
});

export const create = asyncHandler(async (req, res) => {
  const brand = await brandService.createBrand(req.body);
  res.status(201).json({ success: true, message: 'Brand created', data: { brand } });
});

export const update = asyncHandler(async (req, res) => {
  const brand = await brandService.updateBrand(req.params.id, req.body);
  res.json({ success: true, message: 'Brand updated', data: { brand } });
});

export const remove = asyncHandler(async (req, res) => {
  await brandService.deleteBrand(req.params.id);
  res.json({ success: true, message: 'Brand deleted' });
});
