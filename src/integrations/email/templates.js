const BRAND_BLUE = '#2296db';
const BRAND_DARK = '#154366';

function emailLayout({ previewText = '', bodyHtml }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <span style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background-color:${BRAND_DARK};padding:20px 24px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">ITMODERN</span>
                <span style="display:block;color:#cbd5e1;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Best Choice, Best Quality</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;color:#1e293b;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background-color:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} ITMODERN LTD. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url, label) {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background-color:${BRAND_BLUE};color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;font-size:14px;">${label}</a>`;
}

export function verificationEmail({ name, verifyUrl }) {
  return {
    subject: 'Verify your ITMODERN account',
    html: emailLayout({
      previewText: 'Confirm your email address to finish setting up your account.',
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Thanks for creating an account with ITMODERN. Please confirm your email address to activate it.</p>
        ${button(verifyUrl, 'Verify email address')}
        <p style="margin-top:24px;color:#64748b;font-size:12px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
      `,
    }),
  };
}

export function otpEmail({ name, code }) {
  return {
    subject: `Your ITMODERN verification code: ${code}`,
    html: emailLayout({
      previewText: `Your verification code is ${code}.`,
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Use this code to continue:</p>
        <p style="margin:20px 0;padding:16px 24px;background-color:#f1f5f9;border-radius:8px;font-size:28px;font-weight:700;letter-spacing:0.1em;text-align:center;color:#0f172a;">${code}</p>
        <p style="margin-top:24px;color:#64748b;font-size:12px;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
      `,
    }),
  };
}

export function welcomeEmail({ name, shopUrl }) {
  return {
    subject: 'Welcome to ITMODERN',
    html: emailLayout({
      previewText: 'Your account is ready.',
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Your email is verified and your ITMODERN account is ready to go. Browse our latest computers and electronics whenever you're ready.</p>
        ${button(shopUrl, 'Start shopping')}
      `,
    }),
  };
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0,
});

export function orderConfirmationEmail({ name, order, orderUrl }) {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;color:#1e293b;">${item.name} &times; ${item.quantity}</td>
          <td style="padding:6px 0;text-align:right;color:#1e293b;">${currencyFormatter.format(item.subtotal)}</td>
        </tr>`
    )
    .join('');

  return {
    subject: `Order confirmed — ${order.orderNumber}`,
    html: emailLayout({
      previewText: `Your order ${order.orderNumber} has been received.`,
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Thanks for your order! We've received <strong>${order.orderNumber}</strong> and will be in touch shortly to confirm ${
          order.deliveryMethod === 'DELIVERY' ? 'delivery' : 'pickup'
        }.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px;">
          ${rows}
          <tr>
            <td style="padding-top:10px;border-top:1px solid #e2e8f0;font-weight:700;color:#0f172a;">Total</td>
            <td style="padding-top:10px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">${currencyFormatter.format(order.total)}</td>
          </tr>
        </table>
        ${button(orderUrl, 'View order')}
      `,
    }),
  };
}

export function paymentReceivedEmail({ name, order, payment, orderUrl }) {
  return {
    subject: `Payment received — ${order.orderNumber}`,
    html: emailLayout({
      previewText: `We've received your payment for order ${order.orderNumber}.`,
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>We've received your ${payment.network} payment of <strong>${currencyFormatter.format(payment.amount)}</strong> for order <strong>${order.orderNumber}</strong>. Your order is now confirmed.</p>
        ${button(orderUrl, 'View order')}
      `,
    }),
  };
}

export function quotationReadyEmail({ name, quotation, quotationUrl }) {
  const validUntilText = quotation.validUntil
    ? ` It's valid until ${new Date(quotation.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
    : '';

  return {
    subject: `Your quotation is ready — ${quotation.quotationNumber}`,
    html: emailLayout({
      previewText: `Quotation ${quotation.quotationNumber} is ready for your review.`,
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Your quotation <strong>${quotation.quotationNumber}</strong> totaling <strong>${currencyFormatter.format(quotation.total)}</strong> is ready for your review.${validUntilText}</p>
        ${button(quotationUrl, 'View quotation')}
      `,
    }),
  };
}

export function receiptEmail({ name, receipt }) {
  return {
    subject: `Your receipt — ${receipt.receiptNumber}`,
    html: emailLayout({
      previewText: `Receipt ${receipt.receiptNumber} for your purchase at ITMODERN.`,
      bodyHtml: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Thanks for your purchase at ITMODERN. Receipt <strong>${receipt.receiptNumber}</strong> for <strong>${currencyFormatter.format(receipt.total)}</strong> is attached as a PDF — keep it for your records and any warranty claims.</p>
      `,
    }),
  };
}
