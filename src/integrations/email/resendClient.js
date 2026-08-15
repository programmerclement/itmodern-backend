import { Resend } from 'resend';
import { env } from '../../config/env.js';

let client = null;

export function getResendClient() {
  if (!env.resend.apiKey) return null;
  if (!client) {
    client = new Resend(env.resend.apiKey);
  }
  return client;
}
