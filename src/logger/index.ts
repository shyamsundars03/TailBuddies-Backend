const isDev = process.env.NODE_ENV === 'development';

type LogData = string | number | boolean | object | null | undefined;

const logger = {
  info: (message: string, data?: LogData) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, data !== undefined ? data : '');
    }
  },
  
  warn: (message: string, data?: LogData) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
  },
  
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
  },
  
  debug: (message: string, data?: LogData) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },
};

export default logger;