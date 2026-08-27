import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// Static, always-crawlable routes — kept in one place so a new top-level
// page just needs adding here, not hunting through the router.
const STATIC_PATHS = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.9' },
  { path: '/warranty-check', changefreq: 'monthly', priority: '0.3' },
];

function urlEntry(loc, { lastmod, changefreq = 'weekly', priority = '0.6' } = {}) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const sitemap = asyncHandler(async (req, res) => {
  const base = env.frontendUrl.replace(/\/+$/, '');

  const [products, categories] = await Promise.all([
    Product.find({ status: 'published' }).select('slug updatedAt').lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ]);

  const entries = [
    ...STATIC_PATHS.map((p) => urlEntry(`${base}${p.path}`, p)),
    ...categories.map((c) =>
      urlEntry(`${base}/shop/${c.slug}`, { lastmod: c.updatedAt, changefreq: 'weekly', priority: '0.8' })
    ),
    ...products.map((p) =>
      urlEntry(`${base}/products/${p.slug}`, { lastmod: p.updatedAt, changefreq: 'weekly', priority: '0.7' })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(xml);
});
