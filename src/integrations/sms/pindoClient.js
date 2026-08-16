import axios from 'axios';
import { env } from '../../config/env.js';

const REQUEST_TIMEOUT_MS = 15000;
const PINDO_SMS_URL = 'https://api.pindo.io/v1/sms/';

/**
 * Sends a single SMS via Pindo (https://pindo.io). `to` must be in E.164-ish
 * international form (e.g. 2507XXXXXXXX) — Pindo doesn't accept local-format
 * numbers.
 */
export async function sendSms({ to, text }) {
  const response = await axios.post(
    PINDO_SMS_URL,
    { to, text, sender: env.pindo.sender },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${env.pindo.apiKey}`,
      },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    }
  );
  return response.data;
}
