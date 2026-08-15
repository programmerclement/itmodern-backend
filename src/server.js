import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { startPaymentSweep } from './jobs/paymentSweep.js';

const start = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[server] Running in ${env.nodeEnv} mode on port ${env.port}`);
  });

  startPaymentSweep();

  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled rejection:', reason);
    server.close(() => process.exit(1));
  });
};

start();

//