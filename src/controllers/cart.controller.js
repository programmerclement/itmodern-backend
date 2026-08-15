import { asyncHandler } from '../utils/asyncHandler.js';
import * as cartService from '../services/cart.service.js';

export const getMyCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user._id);
  res.json({ success: true, message: 'Cart', data: { cart } });
});

export const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const cart = await cartService.addItem(req.user._id, productId, Number(quantity));
  res.status(201).json({ success: true, message: 'Added to cart', data: { cart } });
});

export const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItemQuantity(
    req.user._id,
    req.params.productId,
    Number(req.body.quantity)
  );
  res.json({ success: true, message: 'Cart updated', data: { cart } });
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.user._id, req.params.productId);
  res.json({ success: true, message: 'Item removed', data: { cart } });
});

export const toggleSaveForLater = asyncHandler(async (req, res) => {
  const cart = await cartService.toggleSaveForLater(req.user._id, req.params.productId);
  res.json({ success: true, message: 'Cart updated', data: { cart } });
});

export const mergeGuestCart = asyncHandler(async (req, res) => {
  const cart = await cartService.mergeGuestCart(req.user._id, req.body.items ?? []);
  res.json({ success: true, message: 'Cart merged', data: { cart } });
});
