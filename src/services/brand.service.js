import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureUniqueSlug } from '../utils/slugify.js';

export async function listBrands({ activeOnly = true } = {}) {
  const query = activeOnly ? { isActive: true } : {};
  return Brand.find(query).sort({ name: 1 });
}

export async function getBrandBySlug(slug) {
  const brand = await Brand.findOne({ slug });
  if (!brand) {
    throw new ApiError(404, 'Brand not found');
  }
  return brand;
}

export async function getBrandById(id) {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new ApiError(404, 'Brand not found');
  }
  return brand;
}

export async function createBrand(data) {
  const slug = await ensureUniqueSlug(Brand, data.name);
  return Brand.create({ ...data, slug });
}

export async function updateBrand(id, data) {
  const brand = await getBrandById(id);

  if (data.name && data.name !== brand.name) {
    brand.slug = await ensureUniqueSlug(Brand, data.name, brand._id);
  }

  Object.assign(brand, data);
  await brand.save();
  return brand;
}

export async function deleteBrand(id) {
  const brand = await getBrandById(id);

  const productCount = await Product.countDocuments({ brand: id });
  if (productCount > 0) {
    throw new ApiError(409, `Cannot delete brand with ${productCount} product(s) assigned to it`);
  }

  await brand.deleteOne();
}
