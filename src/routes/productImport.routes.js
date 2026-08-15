import { Router } from 'express';
import * as productImportController from '../controllers/productImport.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadSpreadsheet } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(protect, authorize('admin'));

router.post('/preview', uploadSpreadsheet.single('file'), productImportController.preview);
router.post('/commit', uploadSpreadsheet.single('file'), productImportController.commit);

export default router;
