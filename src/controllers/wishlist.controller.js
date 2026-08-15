import { asyncHandler } from '../utils/asyncHandler.js';
import * as wishlistService from '../services/wishlist.service.js';

export const getMyWishlist = asyncHandler(async (req, res) => {
  const products = await wishlistService.getWishlist(req.user._id);
  res.json({ success: true, message: 'Wishlist', data: { products } });
});

export const toggle = asyncHandler(async (req, res) => {
  const added = await wishlistService.toggleWishlist(req.user._id, req.params.productId);
  res.json({
    success: true,
    message: added ? 'Added to wishlist' : 'Removed from wishlist',
    data: { added },
  });
});
