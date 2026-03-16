import { AuthController } from '../controllers/auth/auth.controller';
import { AdminController } from '../controllers/admin/admin.controller';
import { UserController } from '../controllers/user/user.controller';
import { AuthService } from '../services/auth/auth.service';
import { AdminService } from '../services/admin/admin.service';
import { UserService } from '../services/user/user.service';
import { UserRepository } from '../repositories/user.repository';
import { OtpRepository } from '../repositories/otp.repository';
import { SpecialtyRepository } from '../repositories/specialty.repository';
import { DoctorRepository } from '../repositories/doctor.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { DoctorService } from '../services/doctor/doctor.service';
import { DoctorController } from '../controllers/doctor/doctor.controller';

// Repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const specialtyRepository = new SpecialtyRepository();
const doctorRepository = new DoctorRepository();

// Services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepository, otpRepository, jwtService, emailService);
const adminService = new AdminService(jwtService, specialtyRepository, userRepository);
const userService = new UserService(userRepository, otpRepository, emailService);
const doctorService = new DoctorService(doctorRepository, specialtyRepository);

// Controllers
const authController = new AuthController(authService);
const adminController = new AdminController(adminService, doctorService);
const userController = new UserController(userService);
const doctorController = new DoctorController(doctorService);

export {
    authController,
    adminController,
    userController,
    doctorController,
};
