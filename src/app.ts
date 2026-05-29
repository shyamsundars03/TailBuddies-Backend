process.env.TZ = 'Asia/Kolkata';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import mongoose from 'mongoose';
import { env } from './config/env';
import logger from './logger';
import { HttpStatus } from './constants';
import routes from './routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import paymentRoutes from './routes/payment.routes';
import prescriptionRoutes from './routes/prescription.routes';
import chatRoutes from './routes/chat.routes';
import agoraRoutes from './routes/agora.routes';
import notificationRoutes from './routes/notification.routes';
import slotRoutes from './routes/slot.routes';
import { errorHandler } from './middleware/error-handler.middleware';


const app = express();


// Middleware
app.use(cookieParser());
app.use(cors({
  origin: env.frontendUrl || 'http://localhost:3000' ,
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
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/slots', slotRoutes);
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










// Global Error handler
app.use(errorHandler);



export default app;