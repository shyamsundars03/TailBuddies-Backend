import nodemailer from 'nodemailer';
import { IEmailService } from './interfaces/IEmailService';
import { env } from '../config/env';
import logger from '../logger';

export class EmailService implements IEmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: env.smtpHost,
            port: env.smtpPort,
            secure: env.smtpPort === 465,
            auth: {
                user: env.smtpUser,
                pass: env.smtpPass,
            },
        });
    }

    async sendEmail(to: string, subject: string, content: string): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: env.smtpUser,
                to,
                subject,
                html: content,
            });
            return true;
        } catch (error) {
            logger.error('Failed to send email:', error);
            return false;
        }
    }

    async sendOTP(to: string, otp: string): Promise<boolean> {
        const subject = 'Your TailBuddies OTP';
        const content = `<h1>TailBuddies OTP</h1><p>Your OTP code is: <strong>${otp}</strong></p>`;
        return this.sendEmail(to, subject, content);
    }
}
