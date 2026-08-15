import { asyncHandler } from '../utils/asyncHandler.js';
import * as productService from '../services/product.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await productService.listProducts(req.query);
  res.json({ success: true, message: 'Products', data: { products: items, pagination } });
});

export const getBySlug = asyncHandler(async (req, res) => {
  const { product, related } = await productService.getProductBySlug(req.params.slug);
  res.json({ success: true, message: 'Product', data: { product, related } });
});

export const adminList = asyncHandler(async (req, res) => {
  const { items, pagination } = await productService.adminListProducts(req.query);
  res.json({ success: true, message: 'Products', data: { products: items, pagination } });
});

export const getById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.json({ success: true, message: 'Product', data: { product } });
});

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, message: 'Product created', data: { product } });
});

export const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, message: 'Product updated', data: { product } });
});

export const publish = asyncHandler(async (req, res) => {
  const product = await productService.setStatus(req.params.id, 'published');
  res.json({ success: true, message: 'Product published', data: { product } });
});

export const unpublish = asyncHandler(async (req, res) => {
  const product = await productService.setStatus(req.params.id, 'draft');
  res.json({ success: true, message: 'Product moved to draft', data: { product } });
});

export const archive = asyncHandler(async (req, res) => {
  const product = await productService.setStatus(req.params.id, 'archived');
  res.json({ success: true, message: 'Product archived', data: { product } });
});

export const toggleFeatured = asyncHandler(async (req, res) => {
  const product = await productService.toggleFeatured(req.params.id);
  res.json({ success: true, message: 'Product updated', data: { product } });
});
