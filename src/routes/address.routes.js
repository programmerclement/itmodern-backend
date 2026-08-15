import { Router } from 'express';
import * as addressController from '../controllers/address.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAddressValidator, updateAddressValidator } from '../validators/address.validator.js';

const router = Router();

router.use(protect);

router.get('/', addressController.list);
router.post('/', createAddressValidator, validate, addressController.create);
router.put('/:id', updateAddressValidator, validate, addressController.update);
router.delete('/:id', addressController.remove);
router.patch('/:id/default', addressController.setDefault);

export default router;
