import { sendSms } from '../integrations/sms/pindoClient.js';
import { env } from '../config/env.js';

// Pindo expects E.164 numbers (e.g. +2507XXXXXXXX — see the Pindo Postman
// collection's own example, "+250799336379"). Most numbers stored in this
// app are local Rwandan format (07XXXXXXXX); convert those, and pass
// anything already-international through untouched (just re-add the `+`).
function toInternational(phone) {
  const digits = phone.replace(/[^\d]/g, '');
  const withCountryCode = digits.startsWith('0') ? `25${digits}` : digits;
  return `+${withCountryCode}`;
}

export async function sendOtpSms(phone, code) {
  if (!env.pindo.apiKey || !env.pindo.sender) {
    console.warn(`[sms] Pindo is not configured — skipping OTP SMS to ${phone}`);
    return { skipped: true };
  }

  try {
    return await sendSms({
      to: toInternational(phone),
      text: `Your ITMODERN verification code is ${code}. It expires in 10 minutes.`,
    });
  } catch (error) {
    console.error(`[sms] Failed to send OTP to ${phone}:`, error.message);
    return { skipped: true, error: error.message };
  }
}

export async function sendCreditReminderSms(phone, receipt) {
  if (!env.pindo.apiKey || !env.pindo.sender) {
    console.warn(`[sms] Pindo is not configured — skipping credit reminder SMS to ${phone}`);
    return { skipped: true };
  }

  try {
    return await sendSms({
      to: toInternational(phone),
      text: `ITMODERN reminder: receipt ${receipt.receiptNumber} has an outstanding balance of ${receipt.balanceDue.toLocaleString()} RWF. Please settle at your earliest convenience. Thank you.`,
    });
  } catch (error) {
    console.error(`[sms] Failed to send credit reminder to ${phone}:`, error.message);
    return { skipped: true, error: error.message };
  }
}

export async function sendReceiptSms(phone, receipt) {
  if (!env.pindo.apiKey || !env.pindo.sender) {
    console.warn(`[sms] Pindo is not configured — skipping receipt SMS to ${phone}`);
    return { skipped: true };
  }

  try {
    return await sendSms({
      to: toInternational(phone),
      text: `Thank you for shopping at ITMODERN. Receipt ${receipt.receiptNumber}, total ${receipt.total.toLocaleString()} RWF. Keep this SMS as proof of purchase for warranty claims.`,
    });
  } catch (error) {
    console.error(`[sms] Failed to send receipt SMS to ${phone}:`, error.message);
    return { skipped: true, error: error.message };
  }
}
