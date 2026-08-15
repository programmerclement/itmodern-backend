import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post(
  '/image',
  protect,
  authorize('admin'),
  uploadImage.single('image'),
  uploadController.uploadProductImage
);

export default router;
