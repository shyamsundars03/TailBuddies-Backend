import { Request, Response } from 'express';
import { IAdminService } from '../../services/interfaces/IAdminService';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';






export class AdminController {


    constructor(private readonly adminService: IAdminService) { }







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



            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, 
            });




            res.status(HttpStatus.OK).json({
                success: true,
                message: SuccessMessages.ADMIN_LOGIN,
                data: {
                    user: {
                        id: result.id,
                        userName: result.email,
                        email: result.email,
                        role: result.role,
                    },
                    accessToken: result.accessToken,
                },
            });




        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : ErrorMessages.ADMIN_INVALID_CREDENTIALS;
            res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message,
            });
        }
    };




// Specialty Management
    createSpecialty = async (req: Request, res: Response): Promise<void> => {
        try {
            const specialty = await this.adminService.createSpecialty(req.body);
            res.status(HttpStatus.CREATED).json({ success: true, data: specialty });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message });
        }
    };







    getSpecialties = async (req: Request, res: Response): Promise<void> => {
        try {


            const page = parseInt(String(req.query.page || '1'));
            const limit = parseInt(String(req.query.limit || '10'));
            const search = req.query.search ? String(req.query.search) : undefined;
            const result = await this.adminService.getSpecialties(page, limit, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });


        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };






    updateSpecialty = async (req: Request, res: Response): Promise<void> => {
        try {

            const id = String(req.params.id);
            const specialty = await this.adminService.updateSpecialty(id, req.body);
            res.status(HttpStatus.OK).json({ success: true, data: specialty });


        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message });
        }
    };



    deleteSpecialty = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = String(req.params.id);
            await this.adminService.deleteSpecialty(id);
            res.status(HttpStatus.OK).json({ success: true, message: 'Specialty deleted' });


        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };





// User Management
    getUsers = async (req: Request, res: Response): Promise<void> => {
        try {



            const page = parseInt(String(req.query.page || '1'));
            const limit = parseInt(String(req.query.limit || '10'));
            const role = req.query.role ? String(req.query.role) : undefined;
            const search = req.query.search ? String(req.query.search) : undefined;
            const result = await this.adminService.getUsers(page, limit, role, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });



        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };




    toggleUserBlock = async (req: Request, res: Response): Promise<void> => {
        try {

            const id = String(req.params.id);
            const user = await this.adminService.toggleUserBlock(id);
            res.status(HttpStatus.OK).json({ success: true, data: user });


            
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };
}
