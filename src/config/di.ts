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
import { IPdfService } from '../services/interfaces/IPdfService';
import { PdfService } from '../services/pdf.service';
import { PrescriptionRepository } from '../repositories/prescription.repository';
import { PrescriptionService } from '../services/prescription.service';
import { PrescriptionController } from '../controllers/prescription.controller';
import { AiAssistantService } from '../services/ai/ai-assistant.service';
import { AiAssistantController } from '../controllers/ai/ai-assistant.controller';
import { ReviewRepository } from '../repositories/review.repository';
import { ReviewService } from '../services/review.service';
import { ReviewController } from '../controllers/review/review.controller';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationController } from '../controllers/notification.controller';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { AdminAnalyticsController } from '../controllers/admin/admin-analytics.controller';
import { SlotRepository } from '../repositories/SlotRepository';

import { SlotService } from '../services/SlotService';
import { SlotController } from '../controllers/doctor/slot.controller';


// Repositories
const userRepository = new UserRepository();
const otpRepository = new OtpRepository();
const specialtyRepository = new SpecialtyRepository();
const doctorRepository = new DoctorRepository();
const petRepository = new PetRepository();
const appointmentRepository = new AppointmentRepository();
const paymentRepository = new PaymentRepository();
const prescriptionRepository = new PrescriptionRepository();
const reviewRepository = new ReviewRepository();
const notificationRepository = new NotificationRepository();
const slotRepository = new SlotRepository();


// Services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepository, otpRepository, jwtService, emailService);
const adminService = new AdminService(jwtService, specialtyRepository, userRepository);
const userService = new UserService(userRepository, otpRepository, emailService);
const doctorService = new DoctorService(doctorRepository, specialtyRepository);
const petService = new PetService(petRepository);
const paymentService = new PaymentService(paymentRepository);
const notificationService = new NotificationService(notificationRepository);
import { NotificationHelper } from '../utils/notification-helper';
NotificationHelper.init(notificationService);

const adminAnalyticsService = new AdminAnalyticsService();
const pdfService = new PdfService();
const prescriptionService = new PrescriptionService(prescriptionRepository, appointmentRepository, doctorRepository, pdfService, notificationService);
const appointmentService = new AppointmentService(appointmentRepository, doctorRepository, petRepository, paymentService, prescriptionRepository, notificationService);
const aiAssistantService = new AiAssistantService(petRepository, doctorRepository, specialtyRepository);
const reviewService = new ReviewService(reviewRepository, appointmentRepository, doctorRepository);
const slotService = new SlotService(slotRepository, doctorRepository, appointmentService);


// Controllers
const authController = new AuthController(authService);
const adminController = new AdminController(adminService, doctorService);
const userController = new UserController(userService);
const doctorController = new DoctorController(doctorService);
const userPetController = new UserPetController(petService);
const adminPetController = new AdminPetController(petService);
const appointmentController = new AppointmentController(appointmentService);
const paymentController = new PaymentController(paymentService);
const prescriptionController = new PrescriptionController(prescriptionService);
const aiAssistantController = new AiAssistantController(aiAssistantService);
const reviewController = new ReviewController(reviewService);
const notificationController = new NotificationController(notificationService);
const adminAnalyticsController = new AdminAnalyticsController(adminAnalyticsService);
const slotController = new SlotController(slotService);


export {
    authController,
    adminController,
    userController,
    doctorController,
    userPetController,
    adminPetController,
    appointmentController,
    appointmentService,
    paymentController,
    prescriptionController,
    aiAssistantController,
    reviewController,
    notificationController,
    adminAnalyticsController,
    slotController
};

