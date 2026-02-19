import mongoose from 'mongoose';
import logger from '../logger';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = env.mongoUri;
    
    // Hide password in logs
    // const safeUri = mongoUri.replace(/:[^:@]+@/, ':****@');
    // logger.info(`Attempting MongoDB connection: ${safeUri}`);
    
    const conn = await mongoose.connect(mongoUri);
    
    // logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database Name: ${conn.connection.name}`);
    
  } catch (error) {
    logger.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error('MongoDB Disconnection Error:', error);
  }
};