export interface IEmailService {
    sendEmail(to: string, subject: string, content: string): Promise<boolean>;
    sendOTP(to: string, otp: string): Promise<boolean>;
}
