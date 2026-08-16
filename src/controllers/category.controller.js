import { asyncHandler } from '../utils/asyncHandler.js';
import * as categoryService from '../services/category.service.js';

export const list = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories({ activeOnly: true });
  res.json({ success: true, message: 'Categories', data: { categories } });
});

export const listAll = asyncHandler(async (req, res) => {
  const { items, pagination } = await categoryService.adminListCategories(req.query);
  res.json({ success: true, message: 'All categories', data: { categories: items, pagination } });
});

export const getBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);
  res.json({ success: true, message: 'Category', data: { category } });
});

export const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

export const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.json({ success: true, message: 'Category updated', data: { category } });
});

export const remove = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.json({ success: true, message: 'Category deleted' });
});
