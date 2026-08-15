import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export const connectDB = async () => {
  if (!env.mongodbUri) {
    console.warn('[db] MONGODB_URI is not set — skipping database connection. Set it in backend/.env');
    return;
  }

  try {
    await mongoose.connect(env.mongodbUri);
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.error('[db] MongoDB connection failed:', error.message);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('[db] MongoDB connection error:', error.message);
});

export const getDbStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] ?? 'unknown';
};
