import { Router } from 'express';
import { authController } from '../config/di';
import { validateRegistration } from '../middleware/validation.middleware';

const router = Router();

router.post('/signup', validateRegistration, authController.register);
router.post('/signin', authController.login);

export default router;