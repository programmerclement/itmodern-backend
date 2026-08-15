import { Router } from 'express';
import * as siteSettingsController from '../controllers/siteSettings.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSiteSettingsValidator } from '../validators/siteSettings.validator.js';

const router = Router();

router.get('/', siteSettingsController.get);
router.put('/', protect, authorize('admin'), updateSiteSettingsValidator, validate, siteSettingsController.update);

export default router;
