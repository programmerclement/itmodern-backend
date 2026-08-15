import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const PRODUCT_FIELDS = 'name slug price compareAtPrice images condition conditionGrade stockQuantity';

async function findOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
}

export async function getWishlist(userId) {
  const wishlist = await findOrCreateWishlist(userId);
  await wishlist.populate({ path: 'products', select: PRODUCT_FIELDS });
  return wishlist.products;
}

export async function toggleWishlist(userId, productId) {
  const product = await Product.findById(productId).select('_id');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const wishlist = await findOrCreateWishlist(userId);
  const index = wishlist.products.findIndex((id) => id.toString() === productId);

  let added;
  if (index >= 0) {
    wishlist.products.splice(index, 1);
    added = false;
  } else {
    wishlist.products.push(productId);
    added = true;
  }

  await wishlist.save();
  return added;
}
