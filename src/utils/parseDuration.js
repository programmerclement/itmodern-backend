const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parses durations like "15m", "7d", "3600" (seconds) into milliseconds.
 */
export function parseDurationMs(duration) {
  if (typeof duration === 'number') return duration * 1000;

  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, amount, unit = 's'] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
}
