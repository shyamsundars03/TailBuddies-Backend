import { Router } from 'express';
import { authController, doctorController } from '../config/di';
import { validateRegistration } from '../middleware/validation.middleware';

const router = Router();

// Public Discovery Routes (at the top)
router.get('/specialties', doctorController.getSpecialties);
router.get('/doctors', doctorController.getAllDoctors);
router.get('/doctors/:id', doctorController.getById);

// Auth Routes
router.post('/signup', validateRegistration, authController.register);
router.post('/signin', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refresh);
router.post('/logout', authController.logout);

export default router;