import { Router } from 'express';
import { adminController } from '../config/di';

const router = Router();

router.post('/signin', adminController.adminLogin);

export default router;
