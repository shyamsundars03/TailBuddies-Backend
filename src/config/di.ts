import { AuthController } from '../controllers/auth/auth.controller';
import { AdminController } from '../controllers/admin/admin.controller';
import { UserController } from '../controllers/user/user.controller';
import { AuthService } from '../services/auth/auth.service';
import { AdminService } from '../services/admin/admin.service';
import { UserService } from '../services/user/user.service';
import { UserRepository } from '../repositories/user.repository';
import { OtpRepository } from '../repositories/otp.repository';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';

// Repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const specialtyRepository = new SpecialtyRepository();

// Services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepository, otpRepository, jwtService, emailService);
const adminService = new AdminService(jwtService, specialtyRepository, userRepository);
const userService = new UserService(userRepository, otpRepository, emailService);

// Controllers
const authController = new AuthController(authService);
const adminController = new AdminController(adminService);
const userController = new UserController(userService);

export {
    authController,
    adminController,
    userController,
};
