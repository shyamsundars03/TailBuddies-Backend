import express from 'express';
import { env } from './config';
import logger from './logger';
import { HttpStatus, SuccessMessages } from './constants';

const app = express();

// Middleware
app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  logger.info('Health check endpoint called');
  res.status(HttpStatus.OK).json({
    success: true,
    message: SuccessMessages.FETCH_SUCCESS,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    },
  });
});

// Start server
const PORT = env.port;

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  console.log(`
    🚀 Server running on http://localhost:${PORT}
    📍 Environment: ${env.nodeEnv}
    🕒 ${new Date().toISOString()}
  `);
});