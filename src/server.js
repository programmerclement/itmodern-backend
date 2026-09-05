import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { startPaymentSweep } from './jobs/paymentSweep.js';
import { startNotificationSweep } from './jobs/notificationSweep.js';
import { initSocket } from './realtime/socket.js';

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(env.port, () => {
    console.log(`[server] Running in ${env.nodeEnv} mode on port ${env.port}`);
  });

  startPaymentSweep();
  startNotificationSweep();

  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled rejection:', reason);
    server.close(() => process.exit(1));
  });
};

start();

//