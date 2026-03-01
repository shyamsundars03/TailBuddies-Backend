import { Router } from 'express';
import { authController } from '../config/di';
import { validateRegistration } from '../middleware/validation.middleware';

const router = Router();

router.post('/signup', validateRegistration, authController.register);
router.post('/signin', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);


// router.post('/change-password', authMiddleware, authController.changePassword);

export default router;