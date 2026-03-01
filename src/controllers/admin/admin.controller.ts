import { Request, Response } from 'express';
import { AdminService } from '../../services/admin/admin.service';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';
import logger from '../../logger';




export class AdminController {


    constructor(private readonly adminService: AdminService) { }






    adminLogin = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: ErrorMessages.REQUIRED_FIELD,
                });
                return;
            }

            const result = await this.adminService.adminLogin({ email, password });

            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.ADMIN_LOGIN,
                data: result,
            });


            
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : ErrorMessages.ADMIN_INVALID_CREDENTIALS;
            logger.error('Admin login failed', { message });
            res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message,
            });
        }
    };
}
