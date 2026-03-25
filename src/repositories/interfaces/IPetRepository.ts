import { IPet } from '../../models/pet.model';

export interface IPetRepository {
  
    createPet(petData: Partial<IPet>): Promise<IPet>;
    findById(id: string): Promise<IPet | null>;
   
    findByOwnerId(ownerId: string, page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }>;
  
    findAll(page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }>;
   
   
    updatePet(id: string, updateData: Partial<IPet>): Promise<IPet | null>;
    toggleActiveStatus(id: string, isActive: boolean): Promise<IPet | null>;
    findByNameAndOwnerId(name: string, ownerId: string): Promise<IPet | null>;
   
   
    deletePet(id: string): Promise<boolean>;
}
