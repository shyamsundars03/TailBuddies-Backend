import { Router, Response, NextFunction, RequestHandler } from 'express';
import { adminController, adminPetController, adminAnalyticsController } from '../config/di';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../enums/user-role.enum';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';
import { validateRequest } from '../middleware/zod-validation.middleware';
import { SpecialtySchema, UpdateSpecialtySchema } from '../dto/specialty/specialty.schema';
import { verifyDoctorSchema } from '../utils/doctor.validator';
import { AdminLoginSchema } from '../dto/admin/admin-login.dto';
import { validateQuery } from '../middleware/zod-validation.middleware';
import {
    DashboardStatsQuerySchema,
    ReportsQuerySchema,
    SpecialtyStatsQuerySchema,
} from '../dto/admin/admin-analytics.schema';

const router = Router();


const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== UserRole.ADMIN) {
        return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
    }
    next();
};

router.post('/signin', validateRequest(AdminLoginSchema), adminController.adminLogin);

// Admin-only management routes
router.use(authMiddleware as unknown as RequestHandler);
router.use(adminOnly as unknown as RequestHandler);

// Analytics & Reports
router.get('/dashboard-stats', validateQuery(DashboardStatsQuerySchema), adminAnalyticsController.getDashboardStats);
router.get('/reports', validateQuery(ReportsQuerySchema), adminAnalyticsController.getReports);
router.get('/specialty-stats', validateQuery(SpecialtyStatsQuerySchema), adminAnalyticsController.getSpecialtyStats);

// Specialty Management
router.post('/specialties', validateRequest(SpecialtySchema), adminController.createSpecialty);
router.get('/specialties', adminController.getSpecialties);
router.patch('/specialties/:id', validateRequest(UpdateSpecialtySchema), adminController.updateSpecialty);
router.delete('/specialties/:id', adminController.deleteSpecialty);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/block', adminController.toggleUserBlock);

// Doctor Management
router.get('/doctors', adminController.getDoctors);
router.get('/doctors/:id', adminController.getDoctorById);
router.patch('/doctors/:id/verify', validateRequest(verifyDoctorSchema), adminController.verifyDoctor);
router.patch('/doctors/:id/reject', validateRequest(verifyDoctorSchema), adminController.verifyDoctor);

// Pet Management (Admin)
router.get('/pets', adminPetController.getAllPets);
router.get('/pets/:id', adminPetController.getPetById);


export default router;
