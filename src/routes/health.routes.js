import { Router } from 'express';
import { getDbStatus } from '../config/db.js';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: getDbStatus(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
