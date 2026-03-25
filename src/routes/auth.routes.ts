import { Router } from 'express';
import { authController, doctorController } from '../config/di';
import { validateRegistration } from '../middleware/validation.middleware';

const router = Router();

// Public Discovery Routes (at the top)
router.get('/specialties', (req, res) => {
    // console.log('[AuthRoutes] Specialties requested');
    return doctorController.getSpecialties(req, res);
});

router.get('/doctors', (req, res) => {
    // console.log('[AuthRoutes] All Doctors requested');
    return doctorController.getAllDoctors(req, res);
});

router.get('/doctors/:id', (req, res) => {
    // console.log(`[AuthRoutes] Doctor by ID requested: ${req.params.id}`);
    return doctorController.getById(req, res);
});

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