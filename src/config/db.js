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

    // Keeps every model's actual indexes (including options like `sparse`)
    // in sync with the schema on every boot — otherwise an index that
    // already exists in the database with different options (e.g. a
    // `unique` index that later became `unique + sparse`) silently keeps
    // its old, stale definition forever, which is easy to miss until it
    // causes confusing duplicate-key errors.
    await mongoose.syncIndexes();
    console.log('[db] Indexes synced');
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
