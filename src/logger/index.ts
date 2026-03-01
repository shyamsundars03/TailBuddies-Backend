import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isDev = process.env.NODE_ENV === 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}${stack ? `\n${stack}` : ''}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: isDev ? 'debug' : 'info',
    format: consoleFormat,
  }),
];

if (!isDev) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    })
  );
} else {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/dev-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
    })
  );
}

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: logFormat,
  transports,
});

export default logger;