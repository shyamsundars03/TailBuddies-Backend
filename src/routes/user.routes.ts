import { Router, RequestHandler } from 'express';
import { userController, authController, userPetController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { ownerOnly } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/zod-validation.middleware';
// import { upload, uploadDoc } from '../middleware/upload.middleware';
import { uploadDoc } from '../middleware/upload.middleware';
import {
    UpdateProfileSchema,
    ProfilePicSchema,
    OtpSchema,
    NewEmailSchema,
    VerifyNewEmailSchema,
} from '../dto/user/user.schema';
import { ChangePasswordSchema } from '../dto/auth/auth.schema';
import { ToggleActiveSchema } from '../dto/pet/pet.schema';

const router = Router();

router.use(authMiddleware as unknown as RequestHandler);

// Profile (authenticated users)
router.get('/profile', userController.getProfile);
router.put('/profile', validateRequest(UpdateProfileSchema), userController.updateProfile);
router.patch('/profile-pic', validateRequest(ProfilePicSchema), userController.updateProfilePic);

// Email change flow
router.post('/change-email/initiate', userController.initiateEmailChange);
router.post('/change-email/verify-current', validateRequest(OtpSchema), userController.verifyCurrentEmail);
router.post('/change-email/send-otp-new', validateRequest(NewEmailSchema), userController.sendOtpToNewEmail);
router.post('/change-email/verify-new', validateRequest(VerifyNewEmailSchema), userController.verifyNewEmail);

router.post('/change-password', validateRequest(ChangePasswordSchema), authController.changePassword);

// Pet management (owner only)
router.post(
    '/pets',
    ownerOnly as unknown as RequestHandler,
    uploadDoc.fields([{ name: 'picture', maxCount: 1 }, { name: 'certificates', maxCount: 10 }]),
    userPetController.addPet
);
router.get('/pets', ownerOnly as unknown as RequestHandler, userPetController.getOwnerPets);
router.get('/pets/:id', ownerOnly as unknown as RequestHandler, userPetController.getPetById);
router.put(
    '/pets/:id',
    ownerOnly as unknown as RequestHandler,
    uploadDoc.fields([{ name: 'picture', maxCount: 1 }, { name: 'certificates', maxCount: 10 }]),
    userPetController.updatePet
);
router.patch('/pets/:id/status', ownerOnly as unknown as RequestHandler, validateRequest(ToggleActiveSchema), userPetController.toggleActiveStatus);
router.delete('/pets/:id', ownerOnly as unknown as RequestHandler, userPetController.deletePet);

export default router;
