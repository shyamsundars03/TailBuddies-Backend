import app from './app';
import { env } from './config/env';
import logger from './logger';
import { connectDB, disconnectDB } from './config/database';
import mongoose from 'mongoose';

const PORT = env.port;

// Connect to database first, then start server
const startServer = async () => {
  try {
    

    await connectDB();
    
    
    const server = app.listen(PORT, () => {


      logger.info(`🚀 Server started on port ${PORT}`);


      logger.info(`
    🚀 TailBuddies API Server Started!
    📍 Environment: ${env.nodeEnv}
    🔗 Port: ${PORT}
    📦 Database: ${mongoose.connection.name}
    🕒 Time: ${new Date().toISOString()}
    📡 URL: http://localhost:${PORT}
      `);



    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Received shutdown signal. Closing gracefully...');
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
        process.exit(0);
      });
    };



    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);


  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  process.exit(1);
});

startServer();