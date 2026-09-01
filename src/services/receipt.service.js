import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import Receipt, { PAYMENT_METHODS } from '../models/Receipt.js';
import Product from '../models/Product.js';
import SerialNumber from '../models/SerialNumber.js';
import SiteSettings from '../models/SiteSettings.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSequentialNumber } from '../utils/sequentialNumber.js';
import { env } from '../config/env.js';
import { sendReceiptSms, sendCreditReminderSms } from './sms.service.js';
import { sendReceiptEmail } from './email.service.js';
import { adjustStock } from './inventory.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '../assets/logo.png');
const SIGNATURE_PATH = path.join(__dirname, '../assets/signature.png');

const PAYMENT_METHOD_LABELS = {
  CASH: 'Cash',
  MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  BK: 'Bank of Kigali',
  EQUITY_BANK: 'Equity Bank',
  OTHER: 'Other',
};

function addWarrantyDuration(startDate, duration, unit) {
  if (!duration || !unit) return null;
  const end = new Date(startDate);
  if (unit === 'days') end.setDate(end.getDate() + duration);
  else if (unit === 'months') end.setMonth(end.getMonth() + duration);
  else if (unit === 'years') end.setFullYear(end.getFullYear() + duration);
  return end;
}

export async function createReceipt(payload, adminUser) {
  const {
    customerName,
    customerPhone = '',
    customerEmail = '',
    items,
    discount = 0,
    paymentMethod,
    warrantyNote = '',
    notes = '',
    saleType = 'FULL',
    amountPaid: rawAmountPaid,
    dueDate,
  } = payload;

  if (!items?.length) {
    throw new ApiError(400, 'At least one item is required');
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, 'Invalid payment method');
  }

  // Resolve + validate every item up front (stock is only decremented once
  // every item has passed, so a bad row never leaves stock half-adjusted).
  const resolved = [];
  for (const item of items) {
    if (!item.name?.trim()) {
      throw new ApiError(400, 'Every item needs a name');
    }
    let product = null;
    if (item.productId) {
      product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found for item "${item.name}"`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new ApiError(409, `"${product.name}" only has ${product.stockQuantity} in stock`);
      }
    }
    resolved.push({ ...item, product });
  }

  const receiptNumber = await generateSequentialNumber(Receipt, 'receiptNumber', 'RCT');

  // Routed through inventory.service so every receipt sale leaves the same
  // InventoryLog audit trail as a manual stock adjustment.
  for (const item of resolved) {
    if (item.product) {
      await adjustStock(
        item.product._id,
        { type: 'OUT', quantity: item.quantity, reason: `Receipt ${receiptNumber} — sold to ${customerName}` },
        adminUser
      );
      await Product.updateOne({ _id: item.product._id }, { $inc: { salesCount: item.quantity } });
    }
  }

  const builtItems = resolved.map((item) => ({
    product: item.product?._id ?? null,
    name: item.name.trim(),
    description: item.description?.trim() ?? '',
    serialNumber: item.serialNumber?.trim() ?? '',
    unitCost: Number(item.unitCost) || 0,
    quantity: Number(item.quantity) || 1,
    amount: (Number(item.unitCost) || 0) * (Number(item.quantity) || 1),
    warrantyDuration: item.warrantyDuration || null,
    warrantyUnit: item.warrantyUnit || null,
  }));

  const subtotal = builtItems.reduce((sum, item) => sum + item.amount, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const isCredit = saleType === 'CREDIT';
  const amountPaid = isCredit ? Math.min(Math.max(0, Number(rawAmountPaid) || 0), total) : total;
  const balanceDue = Math.max(0, total - amountPaid);

  const receipt = await Receipt.create({
    receiptNumber,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerEmail: customerEmail.trim(),
    items: builtItems,
    subtotal,
    discount: Number(discount || 0),
    total,
    paymentMethod,
    warrantyNote: warrantyNote.trim(),
    notes: notes.trim(),
    saleType: isCredit ? 'CREDIT' : 'FULL',
    amountPaid,
    balanceDue,
    dueDate: isCredit && dueDate ? new Date(dueDate) : null,
    issuedBy: adminUser._id,
  });

  // One warranty record per item that has a serial number, so it shows up in
  // the same warranty-check flow used for online-order purchases.
  for (const item of builtItems) {
    if (!item.serialNumber) continue;
    const warrantyEnd = addWarrantyDuration(receipt.createdAt, item.warrantyDuration, item.warrantyUnit);
    await SerialNumber.create({
      product: item.product,
      serialNumber: item.serialNumber,
      receipt: receipt._id,
      purchaseDate: receipt.createdAt,
      warrantyStart: receipt.createdAt,
      warrantyEnd,
      notes: `Issued via receipt ${receiptNumber}`,
    }).catch(() => {
      // A duplicate/invalid serial shouldn't roll back an otherwise-valid sale.
    });
  }

  if (receipt.customerPhone) {
    sendReceiptSms(receipt.customerPhone, receipt)
      .then(async (result) => {
        if (!result?.skipped) {
          receipt.smsSentAt = new Date();
          await receipt.save();
        }
      })
      .catch(() => {});
  }

  return receipt;
}

export async function getReceiptByNumber(receiptNumber) {
  const receipt = await Receipt.findOne({ receiptNumber: receiptNumber.toUpperCase() }).populate(
    'issuedBy',
    'name'
  );
  if (!receipt) {
    throw new ApiError(404, 'Receipt not found');
  }
  return receipt;
}

export async function adminListReceipts({ search, paymentMethod, issuedBy, saleType, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (search) {
    filter.$or = [
      { receiptNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (issuedBy) filter.issuedBy = issuedBy;
  if (saleType) filter.saleType = saleType;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Receipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('issuedBy', 'name'),
    Receipt.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getReceiptStats() {
  const [totals, creditAgg] = await Promise.all([
    Receipt.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' }, collected: { $sum: '$amountPaid' } } },
    ]),
    Receipt.aggregate([
      { $match: { saleType: 'CREDIT', balanceDue: { $gt: 0 } } },
      { $group: { _id: null, count: { $sum: 1 }, outstanding: { $sum: '$balanceDue' } } },
    ]),
  ]);

  return {
    totalReceipts: totals[0]?.count ?? 0,
    totalRevenue: totals[0]?.revenue ?? 0,
    totalCollected: totals[0]?.collected ?? 0,
    creditOutstandingCount: creditAgg[0]?.count ?? 0,
    creditOutstandingTotal: creditAgg[0]?.outstanding ?? 0,
  };
}

// status: 'outstanding' | 'settled' | undefined (all credit sales)
export async function adminListCredits({ status, search, page = 1, limit = 20 } = {}) {
  const filter = { saleType: 'CREDIT' };
  if (status === 'outstanding') filter.balanceDue = { $gt: 0 };
  else if (status === 'settled') filter.balanceDue = { $lte: 0 };
  if (search) {
    filter.$or = [
      { receiptNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Receipt.find(filter)
      .sort({ balanceDue: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('issuedBy', 'name'),
    Receipt.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function recordCreditPayment(receiptNumber, amount) {
  const receipt = await Receipt.findOne({ receiptNumber: receiptNumber.toUpperCase() });
  if (!receipt) {
    throw new ApiError(404, 'Receipt not found');
  }
  if (receipt.saleType !== 'CREDIT') {
    throw new ApiError(400, 'This receipt is not a credit sale');
  }

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    throw new ApiError(400, 'Enter a valid payment amount');
  }
  if (amt > receipt.balanceDue) {
    throw new ApiError(400, `Amount exceeds the outstanding balance of ${receipt.balanceDue.toLocaleString()} RWF`);
  }

  receipt.amountPaid += amt;
  receipt.balanceDue -= amt;
  await receipt.save();
  return receipt;
}

export async function sendCreditReminder(receiptNumber) {
  const receipt = await Receipt.findOne({ receiptNumber: receiptNumber.toUpperCase() });
  if (!receipt) {
    throw new ApiError(404, 'Receipt not found');
  }
  if (receipt.saleType !== 'CREDIT' || receipt.balanceDue <= 0) {
    throw new ApiError(400, 'This receipt has no outstanding balance');
  }
  if (!receipt.customerPhone) {
    throw new ApiError(400, 'No phone number on file for this customer');
  }

  const result = await sendCreditReminderSms(receipt.customerPhone, receipt);
  if (result?.skipped) {
    throw new ApiError(502, result.error || 'SMS could not be sent — check the SMS configuration');
  }

  receipt.lastReminderSentAt = new Date();
  await receipt.save();
  return receipt;
}

function receiptVerifyUrl(receiptNumber) {
  return `${env.frontendUrl}/verify-receipt/${receiptNumber}`;
}

// Public lookup (no auth) behind the QR code printed on every receipt and
// the /verify-receipt page — deliberately returns only what's needed to
// confirm authenticity, not the customer's contact details.
export async function verifyReceipt(receiptNumber) {
  const receipt = await Receipt.findOne({ receiptNumber: receiptNumber.toUpperCase() });
  if (!receipt) {
    throw new ApiError(404, 'No receipt found with this number');
  }

  return {
    valid: true,
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.createdAt,
    customerName: receipt.customerName,
    total: receipt.total,
    itemCount: receipt.items.reduce((sum, item) => sum + item.quantity, 0),
    items: receipt.items.map((item) => ({ name: item.name, quantity: item.quantity })),
  };
}

export async function emailReceipt(receiptNumber, overrideEmail) {
  const receipt = await getReceiptByNumber(receiptNumber);
  const targetEmail = (overrideEmail || receipt.customerEmail || '').trim();
  if (!targetEmail) {
    throw new ApiError(400, 'No email address on file for this receipt — provide one to send to');
  }

  const pdf = await generateReceiptPdf(receiptNumber);
  const result = await sendReceiptEmail(targetEmail, receipt, pdf);
  if (result?.skipped) {
    throw new ApiError(502, result.error || 'Email could not be sent — check the email configuration');
  }

  receipt.emailSentAt = new Date();
  if (!receipt.customerEmail) receipt.customerEmail = targetEmail;
  await receipt.save();

  return receipt;
}

const ITEMS_TABLE_COLUMNS = [
  { key: 'description', label: 'Description', width: 195 },
  { key: 'serialNumber', label: 'S/N', width: 90 },
  { key: 'unitCost', label: 'Unit Cost', width: 75 },
  { key: 'quantity', label: 'Qty', width: 35 },
  { key: 'amount', label: 'Amount', width: 90 },
];

function formatWarranty(duration, unit) {
  if (!duration || !unit) return null;
  return `${duration} ${unit} warranty`;
}

function formatDateTime(date) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString('en-GB');
  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

export async function generateReceiptPdf(receiptNumber) {
  const receipt = await getReceiptByNumber(receiptNumber);
  const settings = await SiteSettings.findOne();
  const qrBuffer = await QRCode.toBuffer(receiptVerifyUrl(receipt.receiptNumber), {
    width: 200,
    margin: 1,
  }).catch(() => null);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const buffered = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const pageWidth = pageRight - pageLeft;

  // --- Header: logo left, receipt meta right ---
  const headerTop = doc.y;
  try {
    doc.image(LOGO_PATH, pageLeft, headerTop, { width: 80 });
  } catch {
    // Missing/corrupt logo file shouldn't block generating the receipt.
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#0f172a')
    .text('SALES & WARRANTY RECEIPT', pageLeft, headerTop, { width: pageWidth, align: 'right' });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text(`Receipt #: ${receipt.receiptNumber}`, pageLeft, headerTop + 22, { width: pageWidth, align: 'right' })
    .text(`Date: ${formatDateTime(receipt.createdAt)}`, pageLeft, headerTop + 35, {
      width: pageWidth,
      align: 'right',
    });

  doc.x = pageLeft;
  doc.y = headerTop + 68;

  // --- Business info ---
  doc.font('Helvetica').fontSize(9).fillColor('#334155');
  if (settings?.contactAddress) doc.text(settings.contactAddress);
  if (settings?.businessTin) doc.text(`TIN: ${settings.businessTin}`);
  if (settings?.contactPhone) doc.text(`Tel: ${settings.contactPhone}`);
  doc.moveDown(0.8);

  // --- Customer ---
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Billed to');
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(receipt.customerName);
  if (receipt.customerPhone) doc.text(receipt.customerPhone);
  if (receipt.customerEmail) doc.text(receipt.customerEmail);
  doc.moveDown(1);

  // --- Items table ---
  const startX = pageLeft;
  const tableWidth = ITEMS_TABLE_COLUMNS.reduce((sum, col) => sum + col.width, 0);
  let y = doc.y;

  const fitText = (text, maxWidth) => {
    const full = String(text ?? '');
    if (doc.widthOfString(full) <= maxWidth) return full;
    let clipped = full;
    while (clipped.length > 0 && doc.widthOfString(`${clipped}…`) > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}…`;
  };

  const drawRow = (cells, { isHeader = false, rowHeight = 16 } = {}) => {
    let x = startX;
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(isHeader ? '#0f172a' : '#334155');
    for (const col of ITEMS_TABLE_COLUMNS) {
      doc.text(fitText(cells[col.key], col.width - 6), x, y, { width: col.width - 6 });
      x += col.width;
    }
    y += rowHeight;
  };

  const drawHeaderRow = () => {
    drawRow(Object.fromEntries(ITEMS_TABLE_COLUMNS.map((c) => [c.key, c.label])), { isHeader: true });
    doc
      .strokeColor('#e2e8f0')
      .moveTo(startX, y - 3)
      .lineTo(startX + tableWidth, y - 3)
      .stroke();
    y += 3;
  };

  drawHeaderRow();

  const descColWidth = ITEMS_TABLE_COLUMNS[0].width - 6;

  for (const item of receipt.items) {
    const warrantyLabel = formatWarranty(item.warrantyDuration, item.warrantyUnit);

    if (y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
    }

    // Name + S/N + cost + qty + amount all sit on one aligned line; specs and
    // warranty are supplementary detail that wraps freely underneath instead
    // of being crammed (and truncated) into that same line.
    drawRow(
      {
        description: item.name,
        serialNumber: item.serialNumber || '—',
        unitCost: item.unitCost.toLocaleString(),
        quantity: String(item.quantity),
        amount: item.amount.toLocaleString(),
      },
      { rowHeight: 14 }
    );

    if (item.description) {
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(item.description, startX, y, { width: descColWidth });
      y = doc.y + 2;
    }
    if (warrantyLabel) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#64748b')
        .text(warrantyLabel, startX, y, { width: descColWidth });
      y = doc.y + 4;
    } else {
      y += 6;
    }
  }

  doc
    .strokeColor('#e2e8f0')
    .moveTo(startX, y + 2)
    .lineTo(startX + tableWidth, y + 2)
    .stroke();
  y += 14;

  // --- Totals (right-aligned box) ---
  const totalsX = startX + tableWidth - 200;
  const drawTotalLine = (label, value, { bold = false, color } = {}) => {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 11 : 9)
      .fillColor(color ?? (bold ? '#0f172a' : '#334155'))
      .text(label, totalsX, y, { width: 110 })
      .text(`${value.toLocaleString()} RWF`, totalsX + 110, y, { width: 90, align: 'right' });
    y += bold ? 18 : 15;
  };

  drawTotalLine('Subtotal', receipt.subtotal);
  if (receipt.discount > 0) drawTotalLine('Discount', -receipt.discount);
  drawTotalLine('Total', receipt.total, { bold: true });
  if (receipt.saleType === 'CREDIT') {
    drawTotalLine('Amount paid', receipt.amountPaid);
    drawTotalLine('Balance due', receipt.balanceDue, { bold: true, color: '#b91c1c' });
  }
  y += 8;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#0f172a')
    .text(`Paid via: ${PAYMENT_METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}`, startX, y);
  y += 24;

  // --- Warranty terms / notes ---
  if (receipt.warrantyNote) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Warranty terms', startX, y);
    y = doc.y + 2;
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(receipt.warrantyNote, startX, y, { width: tableWidth });
    y = doc.y + 10;
  }
  if (receipt.notes) {
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(receipt.notes, startX, y, { width: tableWidth });
    y = doc.y + 10;
  }

  // --- Footer: stamp/signature + verification QR, right after the content
  // above (no more forcing it down to the page bottom, which left a large,
  // ungrounded gap on short receipts) ---
  if (y > doc.page.height - doc.page.margins.bottom - 140) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const footerY = y + 14;

  try {
    doc.image(SIGNATURE_PATH, startX, footerY, { width: 85 });
  } catch {
    // Missing/corrupt signature file shouldn't block generating the receipt.
  }

  const qrX = startX + 110;
  if (qrBuffer) {
    doc.image(qrBuffer, qrX, footerY, { width: 70 });
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#94a3b8')
      .text('Scan to verify this receipt', qrX, footerY + 74, { width: 70, align: 'center' });
  }

  if (receipt.issuedBy?.name) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(`Issued by ${receipt.issuedBy.name}`, startX, footerY + 95, { width: tableWidth, align: 'center' });
  }

  doc
    .font('Helvetica-Oblique')
    .fontSize(10)
    .fillColor('#334155')
    .text('Thank you for doing business with us', startX, footerY + 109, { width: tableWidth, align: 'center' });

  doc.end();
  return buffered;
}
