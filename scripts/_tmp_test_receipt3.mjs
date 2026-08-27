import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Receipt from '../src/models/Receipt.js';
import SerialNumber from '../src/models/SerialNumber.js';
import { createReceipt, generateReceiptPdf, adminListReceipts } from '../src/services/receipt.service.js';

await mongoose.connect(process.env.MONGODB_URI);
const admin = await User.findOne({ role: 'admin' });
const product = await Product.findOne();
const stockBefore = product.stockQuantity;

const receipt = await createReceipt(
  {
    customerName: 'RUZINDANA Jean Paul',
    customerPhone: '0788452338',
    items: [
      {
        productId: product._id.toString(),
        name: product.name,
        description: 'Processor i5, Ram 8gb, SSD 256gb',
        unitCost: 200000,
        quantity: 1,
      },
    ],
    paymentMethod: 'CASH',
    warrantyNote: 'Warranty solved by repairing product or returning goods to Dubai. No refund.',
  },
  admin
);
console.log('Created:', receipt.receiptNumber, '| issuedBy:', receipt.issuedBy, '(', admin.name, ')');

const list = await adminListReceipts({ limit: 1, search: receipt.receiptNumber });
console.log('List issuedBy populated:', JSON.stringify(list.items[0].issuedBy));

const pdf = await generateReceiptPdf(receipt.receiptNumber);
const outPath =
  'C:\\Users\\Clement\\AppData\\Local\\Temp\\claude\\e--Workspace-itmodern\\44462ef9-f89a-4650-bb0f-c46008d2541b\\scratchpad\\test-receipt3.pdf';
fs.writeFileSync(outPath, pdf);
console.log('Wrote', outPath);

await Product.updateOne({ _id: product._id }, { $set: { stockQuantity: stockBefore } });
await SerialNumber.deleteMany({ receipt: receipt._id });
await Receipt.deleteOne({ _id: receipt._id });
console.log('Cleaned up.');
await mongoose.disconnect();
