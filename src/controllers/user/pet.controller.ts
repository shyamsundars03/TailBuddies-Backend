import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { IPetService } from '../../services/interfaces/IPetService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class UserPetController {



    private readonly _petService: IPetService;

    constructor(petService: IPetService) {
        this._petService = petService;
    }





    addPet = async (req: AuthRequest, res: Response): Promise<void> => {
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
            logger.error('Error adding pet', { error: error.message });
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: error.message });
        }
    };









    getOwnerPets = async (req: AuthRequest, res: Response): Promise<void> => {
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
            logger.error('Error fetching owner pets', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch pets' });
        }
    };





    getPetById = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const id = req.params.id as string;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }

            const pet = await this._petService.getPetById(id);
            if (pet.ownerId._id.toString() !== userId) {
                res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'Forbidden' });
                return;
            }

            res.status(HttpStatus.OK).json({ success: true, data: pet });
        } catch (error: any) {
            logger.error('Error fetching pet by id', { error: error.message });
            res.status(HttpStatus.NOT_FOUND).json({ success: false, message: error.message });
        }
    };







    updatePet = async (req: AuthRequest, res: Response): Promise<void> => {
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
            logger.error('Error updating pet', { error: error.message });
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: error.message });
        }
    };










    toggleActiveStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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
            logger.error('Error toggling pet status', { error: error.message });
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: error.message });
        }
    };













    deletePet = async (req: AuthRequest, res: Response): Promise<void> => {
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
            logger.error('Error deleting pet', { error: error.message });
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: error.message });
        }
    };









    
}
