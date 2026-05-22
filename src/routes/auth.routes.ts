import { Router } from 'express';
import { authController, doctorController } from '../config/di';
import { validateRequest } from '../middleware/zod-validation.middleware';
import { 
    LoginSchema, 
    RegisterSchema, 
    VerifyOtpSchema, 
    ForgotPasswordSchema, 
    ResetPasswordSchema, 
    ResendOtpSchema,
    GoogleLoginSchema
} from '../dto/auth/auth.schema';

const router = Router();

// Public Discovery Routes (at the top)
router.get('/specialties', doctorController.getSpecialties);
router.get('/doctors', doctorController.getAllDoctors);
router.get('/doctors/:id', doctorController.getById);

// Auth Routes
router.post('/signup', validateRequest(RegisterSchema), authController.register);
router.post('/signin', validateRequest(LoginSchema), authController.login);
router.post('/google-login', validateRequest(GoogleLoginSchema), authController.googleLogin);
router.post('/verify-otp', validateRequest(VerifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', validateRequest(ResendOtpSchema), authController.resendOtp);
router.post('/forgot-password', validateRequest(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateRequest(ResetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', authController.refresh);
router.post('/logout', authController.logout);

export default router;