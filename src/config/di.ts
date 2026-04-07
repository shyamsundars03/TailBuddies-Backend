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
import { PetRepository } from '../repositories/pet.repository';
import { PetService } from '../services/pet.service';
import { UserPetController } from '../controllers/user/pet.controller';
import { AdminPetController } from '../controllers/admin/pet.controller';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { AppointmentService } from '../services/appointment/appointment.service';
import { AppointmentController } from '../controllers/appointment/appointment.controller';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentService } from '../services/payment/payment.service';
import { PaymentController } from '../controllers/payment/payment.controller';

// Repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const specialtyRepository = new SpecialtyRepository();
const doctorRepository = new DoctorRepository();
const petRepository = new PetRepository();
const appointmentRepository = new AppointmentRepository();
const paymentRepository = new PaymentRepository();

// Services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepository, otpRepository, jwtService, emailService);
const adminService = new AdminService(jwtService, specialtyRepository, userRepository);
const userService = new UserService(userRepository, otpRepository, emailService);
const doctorService = new DoctorService(doctorRepository, specialtyRepository);
const petService = new PetService(petRepository);
const paymentService = new PaymentService(paymentRepository);
const appointmentService = new AppointmentService(appointmentRepository, doctorRepository, petRepository, paymentService);

// Controllers
const authController = new AuthController(authService);
const adminController = new AdminController(adminService, doctorService);
const userController = new UserController(userService);
const doctorController = new DoctorController(doctorService);
const userPetController = new UserPetController(petService);
const adminPetController = new AdminPetController(petService);
const appointmentController = new AppointmentController(appointmentService);
const paymentController = new PaymentController(paymentService);

export {
    authController,
    adminController,
    userController,
    doctorController,
    userPetController,
    adminPetController,
    appointmentController,
    paymentController,
};
