import ExcelJS from 'exceljs';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureUniqueSlug } from '../utils/slugify.js';

const CONDITIONS = ['NEW', 'REFURBISHED', 'USED'];
const GRADES = ['A', 'B', 'C'];

// Maps flexible header text -> canonical field name.
const HEADER_ALIASES = {
  sku: 'sku',
  name: 'name',
  category: 'category',
  brand: 'brand',
  condition: 'condition',
  conditiongrade: 'conditionGrade',
  cpu: 'cpu',
  processor: 'cpu',
  ram: 'ram',
  storage: 'storage',
  storagetype: 'storageType',
  gpu: 'gpu',
  graphics: 'gpu',
  screensize: 'screenSize',
  price: 'price',
  costprice: 'costPrice',
  stock: 'stock',
  warranty: 'warranty',
  description: 'description',
};

function normalizeHeader(header) {
  return String(header ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
}

async function readWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ApiError(400, 'The uploaded file has no worksheets');
  }

  const headerRow = sheet.getRow(1);
  const columnMap = {}; // column index -> canonical field
  headerRow.eachCell((cell, colNumber) => {
    const field = HEADER_ALIASES[normalizeHeader(cell.value)];
    if (field) columnMap[colNumber] = field;
  });

  if (!columnMap || Object.keys(columnMap).length === 0) {
    throw new ApiError(400, 'Could not recognize any columns. Check the file against the expected template.');
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const isEmpty = row.values.length <= 1 || row.values.every((v) => v === null || v === undefined || v === '');
    if (isEmpty) return;

    const data = {};
    for (const [colNumber, field] of Object.entries(columnMap)) {
      const cell = row.getCell(Number(colNumber));
      data[field] = cell.value != null ? String(cell.value).trim() : '';
    }
    rows.push({ rowNumber, data });
  });

  return rows;
}

async function validateRows(rows) {
  const categories = await Category.find().select('name');
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  const brands = await Brand.find().select('name');
  const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b]));

  const existingSkus = new Set((await Product.find().select('sku')).map((p) => p.sku));
  const seenSkusInFile = new Set();

  return rows.map(({ rowNumber, data }) => {
    const errors = [];
    const sku = data.sku?.toUpperCase();

    if (!sku) errors.push('SKU is required');
    else if (existingSkus.has(sku)) errors.push(`SKU "${sku}" already exists`);
    else if (seenSkusInFile.has(sku)) errors.push(`SKU "${sku}" is duplicated in this file`);
    else seenSkusInFile.add(sku);

    if (!data.name) errors.push('Name is required');

    let categoryDoc = null;
    if (!data.category) {
      errors.push('Category is required');
    } else {
      categoryDoc = categoryByName.get(data.category.toLowerCase());
      if (!categoryDoc) errors.push(`Unknown category "${data.category}"`);
    }

    let brandDoc = null;
    if (data.brand) {
      brandDoc = brandByName.get(data.brand.toLowerCase());
      if (!brandDoc) errors.push(`Unknown brand "${data.brand}" (leave blank to skip)`);
    }

    const price = Number(data.price);
    if (!data.price || Number.isNaN(price) || price <= 0) errors.push('Price must be a positive number');

    const costPrice = data.costPrice ? Number(data.costPrice) : null;
    if (data.costPrice && Number.isNaN(costPrice)) errors.push('Cost price must be a number');

    const stock = data.stock ? Number(data.stock) : 0;
    if (data.stock && (Number.isNaN(stock) || stock < 0)) errors.push('Stock must be zero or a positive number');

    const condition = data.condition ? data.condition.toUpperCase() : 'NEW';
    if (!CONDITIONS.includes(condition)) errors.push(`Condition must be one of: ${CONDITIONS.join(', ')}`);

    const conditionGrade = data.conditionGrade ? data.conditionGrade.toUpperCase() : null;
    if (condition !== 'NEW' && !GRADES.includes(conditionGrade)) {
      errors.push('Condition grade (A/B/C) is required for refurbished/used items');
    }

    const warrantyMonths = data.warranty ? Number(data.warranty) : null;
    if (data.warranty && Number.isNaN(warrantyMonths)) errors.push('Warranty must be a number of months');

    const specifications = {};
    if (data.cpu) specifications.processor = data.cpu;
    if (data.ram) specifications.ram = data.ram;
    if (data.storage) specifications.storage = data.storage;
    if (data.storageType) specifications.storageType = data.storageType;
    if (data.gpu) specifications.gpu = data.gpu;
    if (data.screenSize) specifications.screenSize = data.screenSize;

    return {
      rowNumber,
      sku,
      name: data.name,
      category: data.category,
      brand: data.brand || null,
      price: Number.isFinite(price) ? price : null,
      costPrice: Number.isFinite(costPrice) ? costPrice : null,
      stock: Number.isFinite(stock) ? stock : 0,
      condition,
      conditionGrade: condition === 'NEW' ? null : conditionGrade,
      warrantyMonths: Number.isFinite(warrantyMonths) ? warrantyMonths : null,
      description: data.description || '',
      specifications,
      errors,
      valid: errors.length === 0,
      _categoryId: categoryDoc?._id ?? null,
      _brandId: brandDoc?._id ?? null,
    };
  });
}

export async function previewImport(buffer) {
  const rawRows = await readWorkbook(buffer);
  const rows = await validateRows(rawRows);

  const validCount = rows.filter((r) => r.valid).length;

  return {
    summary: { total: rows.length, valid: validCount, invalid: rows.length - validCount },
    rows: rows.map(({ _categoryId, _brandId, ...row }) => row),
  };
}

export async function commitImport(buffer) {
  const rawRows = await readWorkbook(buffer);
  const rows = await validateRows(rawRows);

  const errors = [];
  let imported = 0;

  for (const row of rows) {
    if (!row.valid) {
      errors.push({ row: row.rowNumber, sku: row.sku, reason: row.errors.join('; ') });
      continue;
    }

    try {
      const slug = await ensureUniqueSlug(Product, row.name);
      await Product.create({
        name: row.name,
        slug,
        sku: row.sku,
        category: row._categoryId,
        brand: row._brandId,
        description: row.description,
        condition: row.condition,
        conditionGrade: row.conditionGrade,
        price: row.price,
        costPrice: row.costPrice,
        stockQuantity: row.stock,
        specifications: row.specifications,
        warranty: row.warrantyMonths ? { duration: row.warrantyMonths, unit: 'months' } : undefined,
        status: 'draft',
      });
      imported += 1;
    } catch (error) {
      errors.push({ row: row.rowNumber, sku: row.sku, reason: error.message });
    }
  }

  return {
    summary: { total: rows.length, imported, skipped: rows.length - imported },
    errors,
  };
}
