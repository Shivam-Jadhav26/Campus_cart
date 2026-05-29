import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(process.cwd(), 'logs');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// 🛡️ Custom format for readable logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Capture full stack trace
    logFormat
  ),
  transports: [
    // 1. Error Logs (Separate file for quick lookup)
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d', // Keep for 2 weeks
    }),
    // 2. Combined Logs (Everything)
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
});

// 🚀 Add console transport for all environments to ensure logs appear in cloud dashboards
logger.add(new winston.transports.Console({
  format: combine(
    colorize({ all: process.env.NODE_ENV !== 'production' }), // Colors only in dev
    timestamp({ format: 'HH:mm:ss' }),
    logFormat
  ),
}));

export default logger;
