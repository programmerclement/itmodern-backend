import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureUniqueSlug } from '../utils/slugify.js';

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  popular: { salesCount: -1 },
  featured: { featured: -1, createdAt: -1 },
};

const CARD_FIELDS = 'name slug price compareAtPrice images condition conditionGrade stockQuantity ratingsAverage ratingsCount featured category brand';

export async function listProducts(query = {}) {
  const {
    category,
    brand,
    condition,
    minPrice,
    maxPrice,
    search,
    sort = 'newest',
    page = 1,
    limit = 20,
    featured,
  } = query;

  const filter = { status: 'published' };

  if (category) {
    const categoryDoc = await Category.findOne({ slug: category }).select('_id');
    if (!categoryDoc) {
      return { items: [], pagination: { page: 1, limit: Number(limit) || 20, total: 0, totalPages: 0 } };
    }
    filter.category = categoryDoc._id;
  }

  if (brand) {
    const brandDocs = await Brand.find({ slug: { $in: brand.split(',') } }).select('_id');
    filter.brand = { $in: brandDocs.map((b) => b._id) };
  }

  if (condition) {
    filter.condition = { $in: condition.split(',') };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (featured === 'true') {
    filter.featured = true;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('spec.') && value) {
      filter[`specifications.${key.slice(5)}`] = value;
    }
  }

  const sortSpec = SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(60, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select(CARD_FIELDS)
      .sort(sortSpec)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logoUrl'),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function adminListProducts(query = {}) {
  const { category, brand, condition, status, search, sort = 'newest', page = 1, limit = 20, featured, stockStatus } = query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (featured === 'true') {
    filter.featured = true;
  } else if (featured === 'false') {
    filter.featured = false;
  }

  if (stockStatus === 'out_of_stock') {
    filter.stockQuantity = 0;
  } else if (stockStatus === 'low_stock') {
    filter.stockQuantity = { $gt: 0 };
    filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
  } else if (stockStatus === 'in_stock') {
    filter.$expr = { $gt: ['$stockQuantity', '$lowStockThreshold'] };
  }

  if (category) {
    const categoryDoc = await Category.findOne({ slug: category }).select('_id');
    if (!categoryDoc) {
      return { items: [], pagination: { page: 1, limit: Number(limit) || 20, total: 0, totalPages: 0 } };
    }
    filter.category = categoryDoc._id;
  }

  if (brand) {
    const brandDocs = await Brand.find({ slug: { $in: brand.split(',') } }).select('_id');
    filter.brand = { $in: brandDocs.map((b) => b._id) };
  }

  if (condition) {
    filter.condition = { $in: condition.split(',') };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const sortSpec = SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select('+costPrice')
      .sort(sortSpec)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('brand', 'name slug'),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getProductStats() {
  const [total, published, featured, lowStock, outOfStock] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ status: 'published' }),
    Product.countDocuments({ featured: true }),
    Product.countDocuments({
      stockQuantity: { $gt: 0 },
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }),
    Product.countDocuments({ stockQuantity: 0 }),
  ]);

  return { total, published, featured, lowStock, outOfStock };
}

export async function getProductBySlug(slug, { includeUnpublished = false } = {}) {
  const query = { slug };
  if (!includeUnpublished) query.status = 'published';

  const product = await Product.findOne(query).populate('category').populate('brand');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const related = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    status: 'published',
  })
    .select(CARD_FIELDS)
    .limit(4);

  return { product, related };
}

export async function getProductById(id) {
  const product = await Product.findById(id).select('+costPrice');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  return product;
}

export async function createProduct(data) {
  const categoryDoc = await Category.findById(data.category);
  if (!categoryDoc) {
    throw new ApiError(400, 'Invalid category');
  }

  if (!data.sku) delete data.sku;

  const slug = await ensureUniqueSlug(Product, data.name);
  return Product.create({ ...data, slug });
}

export async function updateProduct(id, data) {
  const product = await getProductById(id);

  if (data.category) {
    const categoryDoc = await Category.findById(data.category);
    if (!categoryDoc) {
      throw new ApiError(400, 'Invalid category');
    }
  }

  if (data.name && data.name !== product.name) {
    product.slug = await ensureUniqueSlug(Product, data.name, product._id);
  }

  if ('sku' in data && !data.sku) {
    product.sku = undefined;
    delete data.sku;
  }

  Object.assign(product, data);
  await product.save();
  return product;
}

export async function setStatus(id, status) {
  const product = await getProductById(id);
  product.status = status;
  await product.save();
  return product;
}

export async function toggleFeatured(id) {
  const product = await getProductById(id);
  product.featured = !product.featured;
  await product.save();
  return product;
}
