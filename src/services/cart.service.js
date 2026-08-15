import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const PRODUCT_FIELDS = 'name slug price compareAtPrice images stockQuantity status condition conditionGrade';

async function findOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

function buildCartResponse(cart) {
  const items = [];
  const savedItems = [];

  for (const item of cart.items) {
    if (!item.product) continue; // product was deleted

    const entry = {
      productId: item.product._id,
      product: item.product,
      quantity: item.quantity,
      available: item.product.status === 'published' && item.product.stockQuantity > 0,
      maxQuantity: item.product.stockQuantity,
    };

    if (item.savedForLater) savedItems.push(entry);
    else items.push(entry);
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, savedItems, subtotal, itemCount };
}

export async function getCart(userId) {
  const cart = await findOrCreateCart(userId);
  await cart.populate({ path: 'items.product', select: PRODUCT_FIELDS });
  return buildCartResponse(cart);
}

export async function addItem(userId, productId, quantity = 1) {
  const product = await Product.findById(productId).select('status stockQuantity');
  if (!product || product.status !== 'published') {
    throw new ApiError(404, 'Product not found');
  }

  const cart = await findOrCreateCart(userId);
  const existing = cart.items.find((item) => item.product.toString() === productId);

  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > product.stockQuantity) {
    throw new ApiError(400, `Only ${product.stockQuantity} in stock`);
  }

  if (existing) {
    existing.quantity = nextQuantity;
    existing.savedForLater = false;
  } else {
    cart.items.push({ product: productId, quantity, savedForLater: false });
  }

  await cart.save();
  return getCart(userId);
}

export async function updateItemQuantity(userId, productId, quantity) {
  if (quantity < 1) {
    return removeItem(userId, productId);
  }

  const cart = await findOrCreateCart(userId);
  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    throw new ApiError(404, 'Item not in cart');
  }

  const product = await Product.findById(productId).select('stockQuantity');
  if (product && quantity > product.stockQuantity) {
    throw new ApiError(400, `Only ${product.stockQuantity} in stock`);
  }

  item.quantity = quantity;
  await cart.save();
  return getCart(userId);
}

export async function removeItem(userId, productId) {
  const cart = await findOrCreateCart(userId);
  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  await cart.save();
  return getCart(userId);
}

export async function toggleSaveForLater(userId, productId) {
  const cart = await findOrCreateCart(userId);
  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    throw new ApiError(404, 'Item not in cart');
  }

  item.savedForLater = !item.savedForLater;
  await cart.save();
  return getCart(userId);
}

export async function mergeGuestCart(userId, guestItems = []) {
  if (!guestItems.length) return getCart(userId);

  const cart = await findOrCreateCart(userId);

  const productIds = guestItems.map((item) => item.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    status: 'published',
  }).select('stockQuantity');
  const stockById = new Map(products.map((p) => [p._id.toString(), p.stockQuantity]));

  for (const guestItem of guestItems) {
    const stock = stockById.get(guestItem.productId);
    if (stock === undefined) continue; // product no longer available

    const existing = cart.items.find((item) => item.product.toString() === guestItem.productId);
    const nextQuantity = Math.min((existing?.quantity ?? 0) + guestItem.quantity, stock);

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cart.items.push({ product: guestItem.productId, quantity: nextQuantity, savedForLater: false });
    }
  }

  await cart.save();
  return getCart(userId);
}

export async function clearActiveItems(userId) {
  const cart = await findOrCreateCart(userId);
  cart.items = cart.items.filter((item) => item.savedForLater);
  await cart.save();
}

export async function getActiveCartForCheckout(userId) {
  const cart = await findOrCreateCart(userId);
  await cart.populate({ path: 'items.product' });
  return cart.items.filter((item) => !item.savedForLater && item.product);
}
