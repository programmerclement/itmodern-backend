import { ApiError } from './ApiError.js';

/**
 * Generates a human-readable sequential identifier like "ITM-20260815-0001",
 * scoped to the current day, retrying a few times on collision.
 */
export async function generateSequentialNumber(Model, fieldName, prefix) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const countToday = await Model.countDocuments({ createdAt: { $gte: startOfDay, $lt: endOfDay } });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sequence = String(countToday + 1 + attempt).padStart(4, '0');
    const candidate = `${prefix}-${datePart}-${sequence}`;
    const exists = await Model.exists({ [fieldName]: candidate });
    if (!exists) return candidate;
  }

  throw new ApiError(500, `Could not generate a ${prefix} number, please try again`);
}
