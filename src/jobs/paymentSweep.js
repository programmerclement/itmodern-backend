import { env } from '../config/env.js';
import { checkAndUpdatePendingPayments } from '../services/payment.service.js';

const SWEEP_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Periodically re-checks PENDING mobile money payments against ITECPAY and
 * expires (with stock release) any that have blown past their 15 minute
 * window without the customer completing them or a webhook arriving.
 */
export function startPaymentSweep() {
  if (!env.itecpay.baseUrl || env.nodeEnv === 'test') {
    return null;
  }

  const interval = setInterval(async () => {
    try {
      const updated = await checkAndUpdatePendingPayments();
      if (updated > 0) {
        console.log(`[payments] Sweep updated ${updated} pending payment(s)`);
      }
    } catch (error) {
      console.error('[payments] Sweep failed:', error.message);
    }
  }, SWEEP_INTERVAL_MS);

  interval.unref();
  return interval;
}
