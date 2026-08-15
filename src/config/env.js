import dotenv from 'dotenv';

dotenv.config();

const required = (name, fallback = undefined) => {
  const value = process.env[name] ?? fallback;
  return value;
};

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('PORT', 5000)),

  mongodbUri: required('MONGODB_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),

  cloudinary: {
    cloudName: required('CLOUDINARY_CLOUD_NAME'),
    apiKey: required('CLOUDINARY_API_KEY'),
    apiSecret: required('CLOUDINARY_API_SECRET'),
  },

  // ITECPAY mobile money gateway (MTN/Airtel/card) — see integrations/payments
  itecpay: {
    baseUrl: required('ITECPAY_BASE_URL'),
    currency: required('ITECPAY_CURRENCY', 'RWF'),
    mtnApiKey: required('ITECPAY_MTN_API_KEY'),
    airtelApiKey: required('ITECPAY_AIRTEL_API_KEY'),
    cardApiKey: required('ITECPAY_CARD_API_KEY'),
    secretKey: required('ITECPAY_SECRET_KEY'),
    webhookSecret: required('ITECPAY_WEBHOOK_SECRET'),
    testMode: required('ITECPAY_TEST_MODE', 'false') === 'true',
  },

  // Resend transactional email — see integrations/email
  resend: {
    apiKey: required('RESEND_API_KEY'),
    fromEmail: required('RESEND_FROM_EMAIL'),
  },

  // Pindo SMS gateway — see integrations/whatsapp (sms sits alongside it) or a dedicated sms integration
  pindo: {
    apiKey: required('PINDO_API_KEY'),
    sender: required('PINDO_SENDER'),
  },

  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
  },

  frontendUrl: required('FRONTEND_URL', 'http://localhost:5173'),
};

export const isProduction = env.nodeEnv === 'production';
