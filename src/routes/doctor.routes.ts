import { Router, Response, NextFunction, RequestHandler } from 'express';
import { doctorController } from '../config/di';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../enums/user-role.enum';
import { AppError } from '../errors/app-error';
import { HttpStatus, ErrorMessages } from '../constants';
import { uploadDoc } from '../middleware/upload.middleware';

const router = Router();


const doctorOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== UserRole.DOCTOR) {
        return next(new AppError(ErrorMessages.FORBIDDEN || 'Access Denied', HttpStatus.FORBIDDEN));
    }
    next();
};


router.use(authMiddleware as unknown as RequestHandler);
router.use(doctorOnly as unknown as RequestHandler);


// Doctor Profile Routes
router.get('/profile', doctorController.getProfile);
router.put('/profile', doctorController.updateProfile);
router.post('/verification-request', doctorController.requestVerification);

// Document Upload
router.post('/upload-document', uploadDoc.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'No file uploaded' });
    }
    res.status(HttpStatus.OK).json({
        success: true,
        data: {
            url: (req.file as any).path,
            filename: req.file.filename,
        }
    });
});

export default router;
