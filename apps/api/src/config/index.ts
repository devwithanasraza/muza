import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.SESSION_SECRET || 'muza-production-jwt-super-secret-key-32-chars!',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  isProduction: process.env.NODE_ENV === 'production',
};
