import { getResendClient } from '../integrations/email/resendClient.js';
import {
  verificationEmail,
  otpEmail,
  welcomeEmail,
  orderConfirmationEmail,
  paymentReceivedEmail,
  quotationReadyEmail,
  receiptEmail,
} from '../integrations/email/templates.js';
import { env } from '../config/env.js';

async function send({ to, subject, html, attachments }) {
  const client = getResendClient();

  if (!client || !env.resend.fromEmail) {
    console.warn(`[email] Resend is not configured — skipping email "${subject}" to ${to}`);
    return { skipped: true };
  }

  try {
    const result = await client.emails.send({
      from: env.resend.fromEmail,
      to,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });
    return result;
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error.message);
    return { skipped: true, error: error.message };
  }
}

export function sendVerificationEmail(user, rawToken) {
  const verifyUrl = `${env.frontendUrl}/verify-email/${rawToken}`;
  const { subject, html } = verificationEmail({ name: user.name, verifyUrl });
  return send({ to: user.email, subject, html });
}

export function sendOtpEmail(user, code) {
  const { subject, html } = otpEmail({ name: user.name, code });
  return send({ to: user.email, subject, html });
}

export function sendWelcomeEmail(user) {
  const shopUrl = `${env.frontendUrl}/shop`;
  const { subject, html } = welcomeEmail({ name: user.name, shopUrl });
  return send({ to: user.email, subject, html });
}

export function sendOrderConfirmationEmail(user, order) {
  const orderUrl = `${env.frontendUrl}/account/orders/${order.orderNumber}`;
  const { subject, html } = orderConfirmationEmail({ name: user.name, order, orderUrl });
  return send({ to: user.email, subject, html });
}

export function sendPaymentReceivedEmail(user, order, payment) {
  const orderUrl = `${env.frontendUrl}/account/orders/${order.orderNumber}`;
  const { subject, html } = paymentReceivedEmail({ name: user.name, order, payment, orderUrl });
  return send({ to: user.email, subject, html });
}

export function sendQuotationReadyEmail(user, quotation) {
  const quotationUrl = `${env.frontendUrl}/account/quotations/${quotation.quotationNumber}`;
  const { subject, html } = quotationReadyEmail({ name: user.name, quotation, quotationUrl });
  return send({ to: user.email, subject, html });
}

// Explicit admin-triggered action (the "Email receipt" button), so unlike
// the other sends here this one isn't fire-and-forget — the caller awaits
// it and reports success/failure back to the admin.
export function sendReceiptEmail(toEmail, receipt, pdfBuffer) {
  const { subject, html } = receiptEmail({ name: receipt.customerName, receipt });
  return send({
    to: toEmail,
    subject,
    html,
    attachments: [
      {
        filename: `receipt-${receipt.receiptNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });
}
