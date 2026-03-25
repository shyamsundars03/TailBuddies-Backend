import { Request, Response } from 'express';
import { IPetService } from '../../services/interfaces/IPetService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class AdminPetController {
    private readonly _petService: IPetService;

    constructor(petService: IPetService) {
        this._petService = petService;
    }










    getAllPets = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string || '1');
            const limit = parseInt(req.query.limit as string || '10');
            const search = req.query.search ? (req.query.search as string) : undefined;

            const result = await this._petService.getAllPets(page, limit, search);
            res.status(HttpStatus.OK).json({ success: true, data: result });
        } catch (error: any) {
            logger.error('Error fetching all pets (Admin)', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch pets' });
        }
    };















    getPetById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id as string;
            const pet = await this._petService.getPetById(id);
            res.status(HttpStatus.OK).json({ success: true, data: pet });
        } catch (error: any) {
            logger.error('Error fetching pet by id (Admin)', { error: error.message });
            res.status(HttpStatus.NOT_FOUND).json({ success: false, message: error.message });
        }
    };











    
}
