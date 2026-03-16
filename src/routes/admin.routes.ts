import { Router, Response, NextFunction, RequestHandler } from 'express';
import { adminController } from '../config/di';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../enums/user-role.enum';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';

const router = Router();

// Simple role check middleware
const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== UserRole.ADMIN) {
        return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
    }
    next();
};

router.post('/signin', adminController.adminLogin);

// Admin-only management routes
router.use(authMiddleware as unknown as RequestHandler);
router.use(adminOnly as unknown as RequestHandler);

// Specialty Management
router.post('/specialties', adminController.createSpecialty);
router.get('/specialties', adminController.getSpecialties);
router.patch('/specialties/:id', adminController.updateSpecialty);
router.delete('/specialties/:id', adminController.deleteSpecialty);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/block', adminController.toggleUserBlock);

// Doctor Management
router.get('/doctors', adminController.getDoctors);
router.get('/doctors/:id', adminController.getDoctorById);
router.patch('/doctors/:id/verify', adminController.verifyDoctor);
router.patch('/doctors/:id/reject', (req, res) => adminController.verifyDoctor(req, res)); // Re-using verifyDoctor but it handles rejection now

export default router;
