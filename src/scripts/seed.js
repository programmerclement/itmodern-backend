import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { toSlug } from '../utils/slugify.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Product from '../models/Product.js';

const CATEGORIES = [
  {
    name: 'Laptops',
    description: 'Laptops for work, study, gaming, and everyday use.',
    sortOrder: 1,
    specFields: [
      { key: 'processor', label: 'Processor', type: 'text', filterable: true },
      { key: 'ram', label: 'RAM', type: 'select', unit: 'GB', options: ['4GB', '8GB', '16GB', '32GB'], filterable: true },
      { key: 'storage', label: 'Storage', type: 'select', options: ['128GB', '256GB', '512GB', '1TB'], filterable: true },
      { key: 'storageType', label: 'Storage Type', type: 'select', options: ['HDD', 'SSD'], filterable: true },
      { key: 'gpu', label: 'Graphics', type: 'text', filterable: true },
      { key: 'screenSize', label: 'Screen Size', type: 'select', unit: 'inch', options: ['13"', '14"', '15.6"', '17"'], filterable: true },
      { key: 'operatingSystem', label: 'Operating System', type: 'text', filterable: false },
      { key: 'battery', label: 'Battery', type: 'text', filterable: false },
    ],
  },
  {
    name: 'Desktops',
    description: 'Desktop towers and all-in-ones for home and office.',
    sortOrder: 2,
    specFields: [
      { key: 'processor', label: 'Processor', type: 'text', filterable: true },
      { key: 'ram', label: 'RAM', type: 'select', unit: 'GB', options: ['4GB', '8GB', '16GB', '32GB'], filterable: true },
      { key: 'storage', label: 'Storage', type: 'select', options: ['256GB', '512GB', '1TB', '2TB'], filterable: true },
      { key: 'storageType', label: 'Storage Type', type: 'select', options: ['HDD', 'SSD'], filterable: true },
      { key: 'gpu', label: 'Graphics', type: 'text', filterable: true },
      { key: 'operatingSystem', label: 'Operating System', type: 'text', filterable: false },
    ],
  },
  {
    name: 'Monitors',
    description: 'Displays for productivity, design, and gaming.',
    sortOrder: 3,
    specFields: [
      { key: 'screenSize', label: 'Screen Size', type: 'select', unit: 'inch', options: ['21.5"', '24"', '27"', '32"'], filterable: true },
      { key: 'resolution', label: 'Resolution', type: 'select', options: ['1366x768', '1920x1080', '2560x1440', '3840x2160'], filterable: true },
      { key: 'refreshRate', label: 'Refresh Rate', type: 'select', unit: 'Hz', options: ['60Hz', '75Hz', '144Hz'], filterable: true },
      { key: 'panelType', label: 'Panel Type', type: 'select', options: ['IPS', 'VA', 'TN'], filterable: true },
      { key: 'ports', label: 'Ports', type: 'text', filterable: false },
    ],
  },
  {
    name: 'Storage Drives',
    description: 'Internal and external SSDs and HDDs.',
    sortOrder: 4,
    specFields: [
      { key: 'capacity', label: 'Capacity', type: 'select', options: ['128GB', '256GB', '512GB', '1TB', '2TB'], filterable: true },
      { key: 'interface', label: 'Interface', type: 'select', options: ['SATA', 'NVMe', 'USB 3.0'], filterable: true },
      { key: 'formFactor', label: 'Form Factor', type: 'select', options: ['2.5"', 'M.2', '3.5"'], filterable: true },
      { key: 'readSpeed', label: 'Read Speed', type: 'text', unit: 'MB/s', filterable: false },
      { key: 'writeSpeed', label: 'Write Speed', type: 'text', unit: 'MB/s', filterable: false },
    ],
  },
  {
    name: 'Networking',
    description: 'Routers, switches, and networking equipment.',
    sortOrder: 5,
    specFields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Router', 'Switch', 'Access Point', 'Extender'], filterable: true },
      { key: 'speed', label: 'Speed', type: 'text', filterable: true },
      { key: 'bands', label: 'Bands', type: 'select', options: ['Single-band', 'Dual-band', 'Tri-band'], filterable: true },
    ],
  },
  {
    name: 'Accessories',
    description: 'Keyboards, mice, bags, and everyday computer accessories.',
    sortOrder: 6,
    specFields: [
      { key: 'type', label: 'Type', type: 'text', filterable: true },
      { key: 'connectivity', label: 'Connectivity', type: 'select', options: ['Wired', 'Wireless', 'Bluetooth'], filterable: true },
    ],
  },
];

const BRANDS = [
  'Dell',
  'HP',
  'Lenovo',
  'Apple',
  'Samsung',
  'Asus',
  'Acer',
  'Logitech',
  'TP-Link',
  'Kingston',
];

const PRODUCTS = [
  // Laptops
  {
    name: 'Dell Latitude 5420',
    category: 'Laptops',
    brand: 'Dell',
    sku: 'DEL-LAT-5420',
    condition: 'REFURBISHED',
    conditionGrade: 'A',
    price: 480000,
    compareAtPrice: 560000,
    stockQuantity: 6,
    featured: true,
    shortDescription: 'Business-grade 14" laptop, refurbished grade A.',
    description: 'A reliable business laptop with a durable chassis, strong battery life, and enough power for office work, browsing, and light development.',
    specifications: { processor: 'Intel Core i5-1145G7', ram: '16GB', storage: '512GB', storageType: 'SSD', gpu: 'Intel Iris Xe', screenSize: '14"', operatingSystem: 'Windows 11 Pro', battery: 'Up to 10 hours' },
    warranty: { duration: 6, unit: 'months' },
    tags: ['business', 'refurbished', 'popular'],
  },
  {
    name: 'HP EliteBook 840 G8',
    category: 'Laptops',
    brand: 'HP',
    sku: 'HP-EB-840G8',
    condition: 'REFURBISHED',
    conditionGrade: 'B',
    price: 520000,
    stockQuantity: 4,
    shortDescription: 'Slim business laptop, refurbished grade B.',
    description: 'Lightweight and professional, ideal for office and remote work with solid performance for everyday multitasking.',
    specifications: { processor: 'Intel Core i7-1165G7', ram: '16GB', storage: '256GB', storageType: 'SSD', gpu: 'Intel Iris Xe', screenSize: '14"', operatingSystem: 'Windows 11 Pro', battery: 'Up to 9 hours' },
    warranty: { duration: 6, unit: 'months' },
    tags: ['business', 'refurbished'],
  },
  {
    name: 'Lenovo ThinkPad T14',
    category: 'Laptops',
    brand: 'Lenovo',
    sku: 'LEN-TP-T14',
    condition: 'NEW',
    price: 950000,
    stockQuantity: 5,
    featured: true,
    shortDescription: 'New ThinkPad with legendary keyboard and durability.',
    description: 'The ThinkPad T14 brings military-grade durability, a best-in-class keyboard, and dependable performance for professionals.',
    specifications: { processor: 'AMD Ryzen 7 5850U', ram: '16GB', storage: '512GB', storageType: 'SSD', gpu: 'AMD Radeon Graphics', screenSize: '14"', operatingSystem: 'Windows 11 Pro', battery: 'Up to 12 hours' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['new', 'business'],
  },
  {
    name: 'Apple MacBook Air M1',
    category: 'Laptops',
    brand: 'Apple',
    sku: 'APL-MBA-M1',
    condition: 'USED',
    conditionGrade: 'A',
    price: 780000,
    compareAtPrice: 850000,
    stockQuantity: 3,
    featured: true,
    shortDescription: 'Fanless, all-day battery, Apple Silicon performance.',
    description: 'The MacBook Air with the M1 chip delivers exceptional performance and battery life in a silent, fanless design. Fully tested and in excellent cosmetic condition.',
    specifications: { processor: 'Apple M1', ram: '8GB', storage: '256GB', storageType: 'SSD', gpu: 'Apple M1 GPU', screenSize: '13"', operatingSystem: 'macOS', battery: 'Up to 18 hours' },
    warranty: { duration: 3, unit: 'months' },
    tags: ['apple', 'used', 'popular'],
  },
  {
    name: 'Asus Vivobook 15',
    category: 'Laptops',
    brand: 'Asus',
    sku: 'ASU-VB-15',
    condition: 'NEW',
    price: 420000,
    stockQuantity: 10,
    shortDescription: 'Everyday laptop for students and home use.',
    description: 'An affordable, capable everyday laptop with a spacious 15.6" display, ideal for students and general home use.',
    specifications: { processor: 'Intel Core i3-1115G4', ram: '8GB', storage: '256GB', storageType: 'SSD', gpu: 'Intel UHD Graphics', screenSize: '15.6"', operatingSystem: 'Windows 11 Home', battery: 'Up to 7 hours' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['student', 'new'],
  },

  // Desktops
  {
    name: 'Dell OptiPlex 7080',
    category: 'Desktops',
    brand: 'Dell',
    sku: 'DEL-OPT-7080',
    condition: 'REFURBISHED',
    conditionGrade: 'A',
    price: 380000,
    stockQuantity: 7,
    shortDescription: 'Compact office desktop, refurbished grade A.',
    description: 'A compact and efficient desktop tower built for office productivity, refurbished and tested to work like new.',
    specifications: { processor: 'Intel Core i5-10500', ram: '16GB', storage: '512GB', storageType: 'SSD', gpu: 'Intel UHD Graphics 630', operatingSystem: 'Windows 11 Pro' },
    warranty: { duration: 6, unit: 'months' },
    tags: ['office', 'refurbished'],
  },
  {
    name: 'HP Pavilion Gaming Desktop',
    category: 'Desktops',
    brand: 'HP',
    sku: 'HP-PAV-GAME',
    condition: 'NEW',
    price: 1150000,
    compareAtPrice: 1280000,
    stockQuantity: 3,
    featured: true,
    shortDescription: 'Gaming desktop with dedicated graphics.',
    description: 'Built for gaming and creative workloads, with a dedicated GPU and plenty of RAM for demanding applications.',
    specifications: { processor: 'AMD Ryzen 5 5600G', ram: '16GB', storage: '1TB', storageType: 'SSD', gpu: 'NVIDIA GTX 1660 Super', operatingSystem: 'Windows 11 Home' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['gaming', 'new'],
  },

  // Monitors
  {
    name: 'Dell 24" FHD Monitor',
    category: 'Monitors',
    brand: 'Dell',
    sku: 'DEL-MON-24',
    condition: 'NEW',
    price: 165000,
    stockQuantity: 15,
    shortDescription: 'Crisp Full HD display for office and home.',
    description: 'A reliable 24" IPS monitor with accurate colors, ideal for office work, browsing, and everyday productivity.',
    specifications: { screenSize: '24"', resolution: '1920x1080', refreshRate: '60Hz', panelType: 'IPS', ports: 'HDMI, VGA' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['office', 'new'],
  },
  {
    name: 'Samsung 27" QHD Monitor',
    category: 'Monitors',
    brand: 'Samsung',
    sku: 'SAM-MON-27Q',
    condition: 'NEW',
    price: 285000,
    stockQuantity: 8,
    featured: true,
    shortDescription: 'Sharp QHD display for creative work.',
    description: 'A 27" QHD monitor with vibrant colors and sharp detail, well suited for design work and multitasking.',
    specifications: { screenSize: '27"', resolution: '2560x1440', refreshRate: '75Hz', panelType: 'IPS', ports: 'HDMI, DisplayPort' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['design', 'new'],
  },
  {
    name: 'Asus TUF 27" 144Hz Gaming Monitor',
    category: 'Monitors',
    brand: 'Asus',
    sku: 'ASU-TUF-27',
    condition: 'NEW',
    price: 340000,
    stockQuantity: 5,
    shortDescription: 'Fast refresh rate for competitive gaming.',
    description: 'A 144Hz gaming monitor with smooth motion clarity, ideal for fast-paced games and esports.',
    specifications: { screenSize: '27"', resolution: '1920x1080', refreshRate: '144Hz', panelType: 'VA', ports: 'HDMI, DisplayPort' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['gaming', 'new'],
  },

  // Storage Drives
  {
    name: 'Kingston A400 480GB SSD',
    category: 'Storage Drives',
    brand: 'Kingston',
    sku: 'KIN-A400-480',
    condition: 'NEW',
    price: 42000,
    stockQuantity: 25,
    shortDescription: 'Affordable SSD upgrade for faster boot times.',
    description: 'Upgrade any laptop or desktop with a fast, reliable SSD — dramatically improves boot and load times over a traditional hard drive.',
    specifications: { capacity: '512GB', interface: 'SATA', formFactor: '2.5"', readSpeed: '500 MB/s', writeSpeed: '450 MB/s' },
    warranty: { duration: 24, unit: 'months' },
    tags: ['upgrade', 'new'],
  },
  {
    name: 'Kingston NV2 1TB NVMe SSD',
    category: 'Storage Drives',
    brand: 'Kingston',
    sku: 'KIN-NV2-1TB',
    condition: 'NEW',
    price: 78000,
    stockQuantity: 18,
    featured: true,
    shortDescription: 'High-speed NVMe storage for modern laptops.',
    description: 'A high-performance M.2 NVMe SSD for laptops and desktops that support it — dramatically faster than SATA SSDs.',
    specifications: { capacity: '1TB', interface: 'NVMe', formFactor: 'M.2', readSpeed: '3500 MB/s', writeSpeed: '2100 MB/s' },
    warranty: { duration: 24, unit: 'months' },
    tags: ['upgrade', 'new'],
  },

  // Networking
  {
    name: 'TP-Link Archer C6 AC1200 Router',
    category: 'Networking',
    brand: 'TP-Link',
    sku: 'TPL-AC6-1200',
    condition: 'NEW',
    price: 38000,
    stockQuantity: 20,
    shortDescription: 'Dual-band Wi-Fi router for home and small office.',
    description: 'A dependable dual-band router delivering solid coverage and speed for homes and small offices.',
    specifications: { type: 'Router', speed: 'AC1200', bands: 'Dual-band' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['networking', 'new'],
  },
  {
    name: 'TP-Link Wi-Fi Range Extender',
    category: 'Networking',
    brand: 'TP-Link',
    sku: 'TPL-EXT-RE220',
    condition: 'NEW',
    price: 22000,
    stockQuantity: 30,
    shortDescription: 'Extend Wi-Fi coverage to dead zones.',
    description: 'Boost your existing Wi-Fi signal to reach further corners of your home or office.',
    specifications: { type: 'Extender', speed: 'AC750', bands: 'Dual-band' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['networking', 'new'],
  },

  // Accessories
  {
    name: 'Logitech MK270 Wireless Combo',
    category: 'Accessories',
    brand: 'Logitech',
    sku: 'LOG-MK270',
    condition: 'NEW',
    price: 28000,
    stockQuantity: 40,
    shortDescription: 'Wireless keyboard and mouse combo.',
    description: 'A comfortable, reliable wireless keyboard and mouse combo for everyday computing.',
    specifications: { type: 'Keyboard & Mouse', connectivity: 'Wireless' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['accessory', 'new'],
  },
  {
    name: 'Logitech M185 Wireless Mouse',
    category: 'Accessories',
    brand: 'Logitech',
    sku: 'LOG-M185',
    condition: 'NEW',
    price: 12000,
    stockQuantity: 50,
    shortDescription: 'Compact and reliable wireless mouse.',
    description: 'A simple, compact wireless mouse that just works — great as a spare or everyday driver.',
    specifications: { type: 'Mouse', connectivity: 'Wireless' },
    warranty: { duration: 12, unit: 'months' },
    tags: ['accessory', 'new'],
  },
];

async function run() {
  if (!env.mongodbUri) {
    console.error('MONGODB_URI is not set. Configure backend/.env before seeding.');
    process.exit(1);
  }

  await mongoose.connect(env.mongodbUri);
  console.log(`Connected to ${mongoose.connection.name}`);

  const categoryIdBySlug = new Map();
  for (const category of CATEGORIES) {
    const slug = toSlug(category.name);
    const doc = await Category.findOneAndUpdate(
      { slug },
      { ...category, slug },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryIdBySlug.set(category.name, doc._id);
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);

  const brandIdByName = new Map();
  for (const name of BRANDS) {
    const slug = toSlug(name);
    const doc = await Brand.findOneAndUpdate(
      { slug },
      { name, slug, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    brandIdByName.set(name, doc._id);
  }
  console.log(`Seeded ${BRANDS.length} brands`);

  for (const item of PRODUCTS) {
    const { category, brand, ...rest } = item;
    const categoryId = categoryIdBySlug.get(category);
    const brandId = brandIdByName.get(brand);

    if (!categoryId) {
      console.warn(`Skipping "${item.name}" — unknown category "${category}"`);
      continue;
    }

    const slug = toSlug(item.name);

    await Product.findOneAndUpdate(
      { sku: item.sku },
      {
        ...rest,
        slug,
        category: categoryId,
        brand: brandId ?? null,
        status: 'published',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
  console.log(`Seeded ${PRODUCTS.length} products`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
