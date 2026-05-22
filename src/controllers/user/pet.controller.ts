import { Response } from 'express';
import { IPetService } from '../../services/interfaces/IPetService';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import { PetSchema, ToggleActiveSchema } from '../../dto/pet/pet.schema';
import { UnauthorizedError, ForbiddenError } from '../../errors/app-error';

export class UserPetController {
    private readonly _petService: IPetService;

    constructor(petService: IPetService) {
        this._petService = petService;
    }

    addPet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

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

        const validatedData = PetSchema.parse(bodyData);
        const pet = await this._petService.addPet(userId, validatedData);
        res.status(HttpStatus.CREATED).json(ApiResponse.success('Pet added successfully', pet));
    };

    getOwnerPets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;
        const search = req.query.search as string | undefined;

        const result = await this._petService.getOwnerPets(userId, page, limit, search);
        res.status(HttpStatus.OK).json(ApiResponse.success('Owner pets fetched', {
            items: result.pets,
            total: result.total
        }));
    };

    getPetById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const id = req.params.id as string;
        if (!userId) throw new UnauthorizedError();

        const pet = await this._petService.getPetById(id);
        const userRole = req.user?.role;
        
        if (userRole !== 'doctor' && pet.ownerId._id.toString() !== userId) {
            throw new ForbiddenError();
        }

        res.status(HttpStatus.OK).json(ApiResponse.success('Pet details fetched', pet));
    };

    updatePet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const id = req.params.id as string;
        if (!userId) throw new UnauthorizedError();

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

        const validatedData = PetSchema.partial().parse(bodyData);
        const pet = await this._petService.updatePet(id, userId, validatedData);
        res.status(HttpStatus.OK).json(ApiResponse.success('Pet updated successfully', pet));
    };

    toggleActiveStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const id = req.params.id as string;
        if (!userId) throw new UnauthorizedError();

        const { isActive } = ToggleActiveSchema.parse(req.body);
        const pet = await this._petService.toggleActiveStatus(id, userId, isActive);
        res.status(HttpStatus.OK).json(ApiResponse.success('Pet status updated successfully', pet));
    };

    deletePet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        const id = req.params.id as string;
        if (!userId) throw new UnauthorizedError();

        await this._petService.deletePet(id, userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Pet deleted successfully'));
    };
}
