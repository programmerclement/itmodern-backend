import slugifyLib from 'slugify';

export function toSlug(text) {
  return slugifyLib(text, { lower: true, strict: true, trim: true });
}

/**
 * Generates a URL slug from `text` and appends -2, -3, ... if it collides
 * with an existing document (excluding `excludeId` when updating).
 */
export async function ensureUniqueSlug(Model, text, excludeId = null) {
  const base = toSlug(text);
  let slug = base;
  let suffix = 2;

  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Model.findOne(query).select('_id').lean();
    if (!existing) return slug;

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}
