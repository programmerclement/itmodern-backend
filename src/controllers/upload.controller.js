import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as uploadService from '../services/upload.service.js';

const ALLOWED_FOLDERS = [
  'itmodern/products',
  'itmodern/brands',
  'itmodern/categories',
  'itmodern/hero',
];

export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const folder = ALLOWED_FOLDERS.includes(req.body.folder) ? req.body.folder : 'itmodern/products';
  const result = await uploadService.uploadImageBuffer(req.file.buffer, folder);
  res.status(201).json({ success: true, message: 'Image uploaded', data: result });
});
