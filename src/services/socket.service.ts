import { Server, Socket } from 'socket.io';
const cookie = require('cookie');
import logger from '../logger';
import { JwtService } from './jwt.service';
import { env } from '../config/env';
import { IChatService } from './interfaces/IChatService';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    role?: string;
}

interface JwtPayload {
    userId: string;
    role: string;
}

export class SocketService {
    private static _io: Server;
    private static _jwtService = new JwtService();
    private static _chatService: IChatService;

    public static initialize(io: Server, chatService: IChatService) {
        this._io = io;
        this._chatService = chatService;

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

                const decoded = this._jwtService.verifyToken(token, env.jwtAccessSecret) as JwtPayload;
                socket.userId = decoded.userId;
                socket.role = decoded.role;

                next();
            } catch (error) {
                logger.error('Socket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this._io.on('connection', (socket: AuthenticatedSocket) => {
            logger.info(`User connected: ${socket.userId} (${socket.id})`);

            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
            }

            socket.on('join-room', async (appointmentId: string) => {
                try {
                    if (!socket.userId || !socket.role) {
                        throw new Error('Authentication error: User not identified');
                    }
                    await this._chatService.getChatHistory(appointmentId, socket.userId, socket.role);
                    socket.join(`appointment:${appointmentId}`);
                    logger.info(`User ${socket.userId} joined room appointment:${appointmentId}`);
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Failed to join room';
                    logger.warn(`Join room denied for ${socket.userId}: ${message}`);
                    socket.emit('error', { message });
                }
            });

            socket.on('send-message', async (data: {
                appointmentId: string;
                senderId: string;
                senderRole: 'owner' | 'doctor';
                message: string;
            }) => {
                const { appointmentId, senderId, senderRole, message } = data;

                try {
                    if (!socket.userId || !socket.role) {
                        throw new Error('Authentication error: User not identified');
                    }

                    const savedMessage = await this._chatService.sendMessage(socket.userId, socket.role, {
                        appointmentId,
                        senderId,
                        senderRole,
                        message,
                    });

                    this._io.to(`appointment:${appointmentId}`).emit('receive-message', {
                        senderId,
                        senderRole,
                        message,
                        timestamp: savedMessage.timestamp || new Date(),
                    });
                } catch (error: unknown) {
                    const errMessage = error instanceof Error
                        ? error.message
                        : 'Failed to send message.';
                    logger.error(`Socket error: ${errMessage}`);
                    socket.emit('error', { message: errMessage });
                }
            });

            socket.on('disconnect', () => {
                logger.info(`User disconnected: ${socket.userId}`);
            });
        });
    }

    public static emitToUser(userId: string, event: string, data: unknown) {
        if (this._io) {
            this._io.to(`user:${userId}`).emit(event, data);
        }
    }

    public static get io() {
        return this._io;
    }
}
