import { getResendClient } from '../integrations/email/resendClient.js';
import {
  verificationEmail,
  passwordResetEmail,
  welcomeEmail,
  orderConfirmationEmail,
  paymentReceivedEmail,
  quotationReadyEmail,
} from '../integrations/email/templates.js';
import { env } from '../config/env.js';

async function send({ to, subject, html }) {
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
    });
    return result;
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error.message);
    return { skipped: true, error: error.message };
  }
}

export function sendVerificationEmail(user, rawToken) {
  const verifyUrl = `${env.frontendUrl}/verify-email/${rawToken}`;
  const { subject, html } = verificationEmail({ firstName: user.firstName, verifyUrl });
  return send({ to: user.email, subject, html });
}

export function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${env.frontendUrl}/reset-password/${rawToken}`;
  const { subject, html } = passwordResetEmail({ firstName: user.firstName, resetUrl });
  return send({ to: user.email, subject, html });
}

export function sendWelcomeEmail(user) {
  const shopUrl = `${env.frontendUrl}/shop`;
  const { subject, html } = welcomeEmail({ firstName: user.firstName, shopUrl });
  return send({ to: user.email, subject, html });
}

export function sendOrderConfirmationEmail(user, order) {
  const orderUrl = `${env.frontendUrl}/account/orders/${order.orderNumber}`;
  const { subject, html } = orderConfirmationEmail({ firstName: user.firstName, order, orderUrl });
  return send({ to: user.email, subject, html });
}

export function sendPaymentReceivedEmail(user, order, payment) {
  const orderUrl = `${env.frontendUrl}/account/orders/${order.orderNumber}`;
  const { subject, html } = paymentReceivedEmail({ firstName: user.firstName, order, payment, orderUrl });
  return send({ to: user.email, subject, html });
}

export function sendQuotationReadyEmail(user, quotation) {
  const quotationUrl = `${env.frontendUrl}/account/quotations/${quotation.quotationNumber}`;
  const { subject, html } = quotationReadyEmail({ firstName: user.firstName, quotation, quotationUrl });
  return send({ to: user.email, subject, html });
}
