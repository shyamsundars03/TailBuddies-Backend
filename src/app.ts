import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import mongoose from 'mongoose';
import { env } from './config/env';
import logger from './logger';
import { HttpStatus, ErrorMessages } from './constants';
import { Request, Response, NextFunction } from 'express';
import routes from './routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();


// Middleware
app.use(cookieParser());
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





app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
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
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Type-narrow 
  const errObj = err as Record<string, unknown>;
  const statusCode = (typeof errObj.statusCode === 'number' ? errObj.statusCode : null) || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = (typeof errObj.message === 'string' ? errObj.message : null) || ErrorMessages.INTERNAL_SERVER;
  const stack = typeof errObj.stack === 'string' ? errObj.stack : undefined;

  if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
    logger.error('Unhandled server error:', {
      message,
      stack,
      path: req.path
    });
  } else {
    logger.warn('Business/Validation error:', {
      statusCode,
      message,
      path: req.path
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack })
  });
});



export default app;