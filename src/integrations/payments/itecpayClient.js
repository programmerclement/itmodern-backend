import axios from 'axios';
import { env } from '../../config/env.js';

// The reference implementation used a 900000ms (15 minute) axios timeout on
// these calls — that's the payment *completion* window, not a sane HTTP
// timeout. ITECPAY's pay endpoint responds as soon as it has pushed the
// USSD/approval prompt, so a much shorter request timeout is used here;
// completion is tracked separately via Payment.paymentTimeoutAt.
const REQUEST_TIMEOUT_MS = 30000;

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

/**
 * v1 API — AIRTEL only.
 */
export async function payAirtel({ amount, phone }) {
  const response = await axios.post(
    `${env.itecpay.baseUrl}/api/pay`,
    { amount, phone, key: env.itecpay.airtelApiKey },
    { headers: JSON_HEADERS, timeout: REQUEST_TIMEOUT_MS, validateStatus: () => true }
  );
  return response.data;
}

/**
 * v2 API — MTN / SPENN.
 */
export async function payMobileMoney({ amount, phone, reqRef, note, message }) {
  const response = await axios.post(
    `${env.itecpay.baseUrl}/api2/pay`,
    { amount, phone, key: env.itecpay.secretKey, req_ref: reqRef, note, message },
    { headers: JSON_HEADERS, timeout: REQUEST_TIMEOUT_MS, validateStatus: () => true }
  );
  return response.data;
}

/**
 * v2 status check — MTN / SPENN only. There is no v1 (AIRTEL) verify
 * endpoint; those payments are confirmed exclusively via webhook.
 */
export async function verifyMobileMoney(reqRef) {
  const response = await axios.post(
    `${env.itecpay.baseUrl}/api2/verify`,
    { action: 'status_check', req_ref: reqRef, key: env.itecpay.secretKey },
    { headers: JSON_HEADERS, timeout: REQUEST_TIMEOUT_MS, validateStatus: () => true }
  );
  return response.data;
}
