import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import { env, isProduction } from './config/env.js';
import routes from './routes/index.js';
import sitemapRoutes from './routes/sitemap.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Render (and most PaaS hosts) sit behind a reverse proxy — trust its
// X-Forwarded-For header so express-rate-limit and req.ip see the real
// client IP instead of the proxy's.
if (isProduction) {
  app.set('trust proxy', 1);
}

// Always allow the production domain (custom domain + the default Netlify
// subdomain, which stays live alongside it) plus whatever FRONTEND_URL is
// set to in .env (localhost in dev, etc.) — dedupe in case of overlap.
const ALLOWED_ORIGINS = [
  ...new Set([
    env.frontendUrl,
    'https://itmodernltd.com',
    'https://www.itmodernltd.com',
    'https://itmodern.netlify.app',
  ]),
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (!isProduction) {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Outside /api and its rate limiter — crawlers hit this on their own
// schedule and it shouldn't compete with real API traffic for the limit.
app.use('/sitemap.xml', sitemapRoutes);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
