import { Server, Socket } from 'socket.io';
const cookie = require('cookie');
import logger from '../logger';
import { Appointment } from '../models/appointment.model';
import { JwtService } from './jwt.service';
import { env } from '../config/env';
import { ChatMessage } from '../models/chat-message.model';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    roles?: string[];
}

export class SocketService {
    private static _io: Server;
    private static _jwtService = new JwtService();

    public static initialize(io: Server) {
        this._io = io;

        // Authentication Middleware
        this._io.use((socket: AuthenticatedSocket, next) => {
            try {
                let token = socket.handshake.auth?.token;

                if (!token) {
                    const cookieHeader = socket.handshake.headers.cookie;
                    if (cookieHeader) {
                        const cookies = cookie.parse(cookieHeader);
                        token = cookies.token || cookies.accessToken;
                    }
                }

                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                const decoded = this._jwtService.verifyToken(token, env.jwtAccessSecret) as any;
                socket.userId = decoded.userId;
                socket.roles = decoded.role;

                next();
            } catch (error) {
                logger.error('Socket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this._io.on('connection', (socket: AuthenticatedSocket) => {
            logger.info(`User connected: ${socket.userId} (${socket.id})`);

            socket.on('join-room', (appointmentId: string) => {
                socket.join(`appointment:${appointmentId}`);
                logger.info(`User ${socket.userId} joined room appointment:${appointmentId}`);
            });

            socket.on('send-message', async (data: { appointmentId: string, senderId: string, senderRole: 'owner' | 'doctor', message: string }) => {
                const { appointmentId, senderId, senderRole, message } = data;

                try {
                    // Verify the sender matches the authenticated user
                    // Ensure both are compared as strings to avoid any mismatch
                    const authenticatedUserId = String(socket.userId);
                    const providedSenderId = String(senderId);

                    if (providedSenderId !== authenticatedUserId) {
                        logger.warn(`Sender ID mismatch: Authenticated=${authenticatedUserId}, Provided=${providedSenderId}`);
                        throw new Error('Unauthorized: Sender ID mismatch');
                    }

                    // Time-restricting logic: check if appointment is currently active
                    const appointment = await Appointment.findById(appointmentId);
                    if (!appointment) throw new Error('Appointment not found');

                    const now = new Date();
                    const [startH, startM] = appointment.appointmentStartTime.split(':').map(Number);
                    const [endH, endM] = appointment.appointmentEndTime.split(':').map(Number);
                    
                    const apptStart = new Date(appointment.appointmentDate);
                    apptStart.setHours(startH, startM, 0, 0);
                    
                    const apptEnd = new Date(appointment.appointmentDate);
                    apptEnd.setHours(endH, endM, 0, 0);

                    // Allow chat strictly from start time to end time
                    if (now < apptStart || now > apptEnd) {
                        socket.emit('error', { message: 'Chat is only active during the consultation time window.' });
                        return;
                    }

                    // Save message to database for persistence
                    try {
                        await ChatMessage.create({
                            appointmentId: appointment._id,
                            senderId: authenticatedUserId,
                            senderRole: senderRole,
                            message: message,
                            timestamp: now
                        });
                        logger.info(`Message persisted for appointment ${appointmentId}`);
                    } catch (dbError) {
                        logger.error('Failed to persist chat message:', dbError);
                        // We still broadcast the message even if persistence fails to avoid blocking the user
                    }

                    this._io.to(`appointment:${appointmentId}`).emit('receive-message', {
                        senderId,
                        senderRole,
                        message,
                        timestamp: new Date()
                    });

                } catch (error: any) {
                    logger.error(`Socket error: ${error.message}`);
                    socket.emit('error', { message: error.message || 'Failed to send message.' });
                }
            });

            socket.on('disconnect', () => {
                logger.info(`User disconnected: ${socket.userId}`);
            });
        });
    }

    public static get io() {
        return this._io;
    }
}
