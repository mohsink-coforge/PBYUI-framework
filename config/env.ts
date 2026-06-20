import dotenv from 'dotenv';

dotenv.config();

export const env = {
  baseUrl: process.env.BASE_URL || 'https://your-application-url.com',
  oneLoginDashboard: process.env.ONE_LOGIN_DASHBOARD!,
  username: process.env.APP_USER || '',
  password: process.env.APP_PASS || ''
};

export function validateRequiredEnv(): void {
  const missing: string[] = [];
  if (!env.baseUrl || env.baseUrl.includes('your-application-url')) missing.push('BASE_URL');
  if (!env.username) missing.push('APP_USER');
  if (!env.password) missing.push('APP_PASS');

  if (missing.length > 0) {
    throw new Error(`Missing required env values: ${missing.join(', ')}. Copy .env.example to .env and update values.`);
  }
}
