import { Response, NextFunction } from 'express';
import { IPetService } from '../../services/interfaces/IPetService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class UserPetController {

    private readonly _petService: IPetService;

    constructor(petService: IPetService) {
        this._petService = petService;
    }

    addPet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const bodyData = { ...req.body };
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            
            if (files?.picture?.[0]) {
                bodyData.picture = files.picture[0].path;
            }

            if (typeof bodyData.vaccinations === 'string') {
                bodyData.vaccinations = JSON.parse(bodyData.vaccinations);
            }

            if (files?.certificates?.length && Array.isArray(bodyData.vaccinations)) {
                files.certificates.forEach((cert, index) => {
                    if (bodyData.vaccinations[index]) {
                        bodyData.vaccinations[index].certificate = cert.path;
                    }
                });
            }

            const pet = await this._petService.addPet(userId, bodyData);
            res.status(HttpStatus.CREATED).json({ success: true, data: pet, message: 'Pet added successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    getOwnerPets = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 5;
            const search = req.query.search as string | undefined;

            const result = await this._petService.getOwnerPets(userId, page, limit, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });
        } catch (error: any) {
            next(error);
        }
    };

    getPetById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const id = req.params.id as string;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const pet = await this._petService.getPetById(id);
            const userRole = req.user?.role;
            
            if (userRole !== 'doctor' && pet.ownerId._id.toString() !== userId) {
                res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'Forbidden' });
                return;
            }

            res.status(HttpStatus.OK).json({ success: true, data: pet });
        } catch (error: any) {
            next(error);
        }
    };

    updatePet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const id = req.params.id as string;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const bodyData = { ...req.body };
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            
            if (files?.picture?.[0]) {
                bodyData.picture = files.picture[0].path;
            }

            if (typeof bodyData.vaccinations === 'string') {
                bodyData.vaccinations = JSON.parse(bodyData.vaccinations);
            }

            if (files?.certificates?.length && Array.isArray(bodyData.vaccinations)) {
                files.certificates.forEach((cert, index) => {
                    if (bodyData.vaccinations[index]) {
                        bodyData.vaccinations[index].certificate = cert.path;
                    }
                });
            }

            const pet = await this._petService.updatePet(id, userId, bodyData);
            res.status(HttpStatus.OK).json({ success: true, data: pet, message: 'Pet updated successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    toggleActiveStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const id = req.params.id as string;
            const { isActive } = req.body;
            
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            if (isActive === undefined) {
                res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'isActive field is required' });
                return;
            }

            const pet = await this._petService.toggleActiveStatus(id, userId, isActive);
            res.status(HttpStatus.OK).json({ success: true, data: pet, message: 'Pet status updated successfully' });
        } catch (error: any) {
            next(error);
        }
    };

    deletePet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const id = req.params.id as string;
            
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            await this._petService.deletePet(id, userId);
            res.status(HttpStatus.OK).json({ success: true, message: 'Pet deleted successfully' });
        } catch (error: any) {
            next(error);
        }
    };
}
