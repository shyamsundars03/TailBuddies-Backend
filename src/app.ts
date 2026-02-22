import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env';
import logger from './logger';
import { HttpStatus, SuccessMessages, ErrorMessages } from './constants';
import { Request, Response, NextFunction } from 'express';
import routes from './routes';
import authRoutes from './routes/auth.routes';

const app = express();

// Middleware
app.use(cors({
  origin: env.frontendUrl || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/health', (req, res) => {
  logger.debug('Health check endpoint called');
  res.status(HttpStatus.OK).json({
    success: true,
    message: SuccessMessages.FETCH_SUCCESS,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  });
});

// Test DB route (temporary - remove later)
app.get('/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Database status',
      data: {
        status: statusMap[dbStatus],
        database: mongoose.connection.name,
        host: mongoose.connection.host,
      },
    });
  } catch (error) {
    logger.error('Error checking DB:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error checking database',
    });
  }
});


app.use('/api/auth', authRoutes);
app.use('/api', routes);




// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    path: req.path,
    originalUrl: req.originalUrl,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: err.message || ErrorMessages.INTERNAL_SERVER,
  });
});

export default app;