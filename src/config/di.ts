import { AuthController } from '../controllers/auth/auth.controller';
import { AdminController } from '../controllers/admin/admin.controller';
import { AuthService } from '../services/auth/auth.service';
import { AdminService } from '../services/admin/admin.service';
import { UserRepository } from '../repositories/user.repository';
import { OtpRepository } from '../repositories/otp.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';

// Repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();

// Services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepository, otpRepository, jwtService, emailService);
const adminService = new AdminService(jwtService);

// Controllers
const authController = new AuthController(authService);
const adminController = new AdminController(adminService);

export {
    authController,
    adminController,
};
