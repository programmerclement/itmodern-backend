import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureUniqueSlug } from '../utils/slugify.js';

export async function listCategories({ activeOnly = true } = {}) {
  const query = activeOnly ? { isActive: true } : {};
  return Category.find(query).sort({ sortOrder: 1, name: 1 });
}

export async function getCategoryBySlug(slug) {
  const category = await Category.findOne({ slug });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return category;
}

export async function getCategoryById(id) {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return category;
}

export async function createCategory(data) {
  const slug = await ensureUniqueSlug(Category, data.name);
  const category = await Category.create({ ...data, slug });
  return category;
}

export async function updateCategory(id, data) {
  const category = await getCategoryById(id);

  if (data.name && data.name !== category.name) {
    category.slug = await ensureUniqueSlug(Category, data.name, category._id);
  }

  Object.assign(category, data);
  await category.save();
  return category;
}

export async function deleteCategory(id) {
  const category = await getCategoryById(id);

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(409, `Cannot delete category with ${productCount} product(s) assigned to it`);
  }

  await category.deleteOne();
}
