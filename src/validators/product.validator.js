import { body } from 'express-validator';

const CONDITIONS = ['NEW', 'REFURBISHED', 'USED'];
const GRADES = ['A', 'B', 'C'];

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('category').isMongoId().withMessage('A valid category is required'),
  body('brand').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid brand'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('compareAtPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('costPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('condition').optional().isIn(CONDITIONS).withMessage('Invalid condition'),
  body('conditionGrade').optional({ values: 'falsy' }).isIn(GRADES).withMessage('Invalid condition grade'),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  body('images').optional().isArray(),
  body('specifications').optional().isObject(),
  body('tags').optional().isArray(),
  body('warranty.duration').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('warranty.unit').optional({ values: 'falsy' }).isIn(['days', 'months', 'years']),
];

export const updateProductValidator = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('sku').optional().trim().notEmpty().withMessage('SKU cannot be empty'),
  body('category').optional().isMongoId().withMessage('Invalid category'),
  body('brand').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid brand'),
  body('price').optional().isFloat({ min: 0 }),
  body('compareAtPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('costPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('condition').optional().isIn(CONDITIONS).withMessage('Invalid condition'),
  body('conditionGrade').optional({ values: 'falsy' }).isIn(GRADES).withMessage('Invalid condition grade'),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  body('images').optional().isArray(),
  body('specifications').optional().isObject(),
  body('tags').optional().isArray(),
];
