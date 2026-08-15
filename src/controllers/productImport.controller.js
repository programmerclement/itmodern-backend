import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as productImportService from '../services/productImport.service.js';

export const preview = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }
  const result = await productImportService.previewImport(req.file.buffer);
  res.json({ success: true, message: 'Import preview', data: result });
});

export const commit = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }
  const result = await productImportService.commitImport(req.file.buffer);
  res.json({ success: true, message: 'Import complete', data: result });
});
