import { Router } from 'express';
import { userController, authController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All user routes are protected
router.use(authMiddleware);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.patch('/profile-pic', userController.updateProfilePic);

// Email Change Flow
router.post('/change-email/initiate', userController.initiateEmailChange);
router.post('/change-email/verify-current', userController.verifyCurrentEmail);
router.post('/change-email/send-otp-new', userController.sendOtpToNewEmail);
router.post('/change-email/verify-new', userController.verifyNewEmail);

router.post('/change-password', authController.changePassword);

export default router;
