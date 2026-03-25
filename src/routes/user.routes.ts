import { Router } from 'express';
import { userController, authController, userPetController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload, uploadDoc } from '../middleware/upload.middleware';

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

// Pet Management (Owner)
router.post('/pets', uploadDoc.fields([{ name: 'picture', maxCount: 1 }, { name: 'certificates', maxCount: 10 }]), userPetController.addPet);
router.get('/pets', userPetController.getOwnerPets);
router.get('/pets/:id', userPetController.getPetById);
router.put('/pets/:id', uploadDoc.fields([{ name: 'picture', maxCount: 1 }, { name: 'certificates', maxCount: 10 }]), userPetController.updatePet);
router.patch('/pets/:id/status', userPetController.toggleActiveStatus);
router.delete('/pets/:id', userPetController.deletePet);

export default router;
