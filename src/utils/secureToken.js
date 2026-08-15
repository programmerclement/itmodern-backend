import crypto from 'crypto';

/**
 * Generates a random token to send to the user (e.g. in an email link),
 * plus its SHA-256 hash to persist in the database. Only the hash is
 * stored, so a leaked database never exposes usable tokens.
 */
export function generateSecureToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
