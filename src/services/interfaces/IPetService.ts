import { IPet } from '../../models/pet.model';

export interface IPetService {
    addPet(ownerId: string, petData: Partial<IPet>): Promise<IPet>;
    getOwnerPets(ownerId: string, page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }>;
    getPetById(id: string): Promise<IPet>;
    updatePet(id: string, ownerId: string, updateData: Partial<IPet>): Promise<IPet>;
    toggleActiveStatus(id: string, ownerId: string, isActive: boolean): Promise<IPet>;
    getAllPets(page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }>;
    deletePet(id: string, ownerId: string): Promise<void>;
}
