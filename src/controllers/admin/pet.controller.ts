import { Request, Response } from 'express';
import { IPetService } from '../../services/interfaces/IPetService';
import { HttpStatus } from '../../constants';
import { ApiResponse } from '../../utils/api-response';

export class AdminPetController {
    private readonly _petService: IPetService;

    constructor(petService: IPetService) {
        this._petService = petService;
    }

    getAllPets = async (req: Request, res: Response): Promise<void> => {
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '10');
        const search = req.query.search ? (req.query.search as string) : undefined;

        const result = await this._petService.getAllPets(page, limit, search);
        res.status(HttpStatus.OK).json(ApiResponse.success('Pets fetched successfully', {
            items: result.pets,
            total: result.total,
            page,
            limit
        }));
    };

    getPetById = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const pet = await this._petService.getPetById(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Pet details fetched', pet));
    };
}
