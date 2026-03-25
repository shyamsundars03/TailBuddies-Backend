import { Request, Response } from 'express';
import { IAdminService } from '../../services/interfaces/IAdminService';
import { IDoctorService } from '../../services/interfaces/IDoctorService';
import { HttpStatus, SuccessMessages, ErrorMessages } from '../../constants';
import logger from '../../logger';
import { verifyDoctorSchema } from '../../utils/doctor.validator';
import { env } from '../../config/env';





export class AdminController {


    private readonly _adminService: IAdminService;
    private readonly _doctorService: IDoctorService;

    constructor(
        adminService: IAdminService,
        doctorService: IDoctorService
    ) {
        this._adminService = adminService;
        this._doctorService = doctorService;
    }







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



            const result = await this._adminService.adminLogin({ email, password });

console.log("afaf",result)
// logger.info(result)

            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: env.jwtRefreshMaxAge,
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





    createSpecialty = async (req: Request, res: Response): Promise<void> => {
        try {
            const specialty = await this._adminService.createSpecialty(req.body);
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
            const result = await this._adminService.getSpecialties(page, limit, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });


        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };






    updateSpecialty = async (req: Request, res: Response): Promise<void> => {
        try {

            const id = String(req.params.id);
            const specialty = await this._adminService.updateSpecialty(id, req.body);
            res.status(HttpStatus.OK).json({ success: true, data: specialty });


        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message });
        }
    };



    deleteSpecialty = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = String(req.params.id);
            await this._adminService.deleteSpecialty(id);
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
            const result = await this._adminService.getUsers(page, limit, role, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });



        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };




    toggleUserBlock = async (req: Request, res: Response): Promise<void> => {
        try {

            const id = String(req.params.id);
            const user = await this._adminService.toggleUserBlock(id);
            res.status(HttpStatus.OK).json({ success: true, data: user });


            
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message });
        }
    };







    // Doctor Management
    getDoctors = async (req: Request, res: Response) => {
        try {
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const isVerified = req.query.isVerified ? String(req.query.isVerified) === 'true' : undefined;
            const status = typeof req.query.status === 'string' ? req.query.status : undefined;

            const result = await this._doctorService.getAllDoctors(page, limit, search, isVerified, status);
            
            res.status(HttpStatus.OK).json({
                success: true,
                data: result.doctors,
                total: result.total,
                page,
                limit,
            });
        } catch (error: any) {
            logger.error('Error fetching all doctors (Admin)', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };










    getDoctorById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const profile: any = await this._doctorService.getDoctorById(String(id));
            
            // console.log(`[AdminController] getDoctorById(${id}) result:`, {
            //     id: profile?._id,
            //     hasUserId: !!profile?.userId,
            //     userIdIsObject: typeof profile?.userId === 'object',
            //     userName: profile?.userId?.userName,
            //     specialtyId: profile?.profile?.specialtyId,
            //     specialtyName: profile?.profile?.specialtyId?.name
            // });

            res.status(HttpStatus.OK).json({ success: true, data: profile });
        } catch (error: any) {
            logger.error('Error fetching doctor by id (Admin)', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };











    verifyDoctor = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            

            const validationResult = verifyDoctorSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationResult.error.format()
                });
                return;
            }

            const updatedDoctor = await this._doctorService.verifyDoctor(String(id), req.body);
            res.status(HttpStatus.OK).json({
                success: true,
                message: `Doctor ${req.body.isVerified ? 'verified' : 'rejected'} successfully`,
                data: updatedDoctor,
            });
        } catch (error: any) {
            logger.error('Error verifying doctor (Admin)', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };







}
