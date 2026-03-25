import { IPet } from '../models/pet.model';
import { IPetRepository } from '../repositories/interfaces/IPetRepository';
import { IPetService } from './interfaces/IPetService';

export class PetService implements IPetService {
    
    
    
    constructor(private readonly petRepository: IPetRepository) {}


    async addPet(ownerId: string, petData: Partial<IPet>): Promise<IPet> {
        if (petData.name) {
            const existingPet = await this.petRepository.findByNameAndOwnerId(petData.name, ownerId);
            if (existingPet) {
                throw new Error('You already have a pet with this name');
            }
        }
        
        
        if (petData.vaccinations && petData.vaccinations.length > 0) {
            petData.isVaccinated = 'YES';
        } else {
            petData.isVaccinated = 'NO';
        }
        
        return await this.petRepository.createPet({ ...petData, ownerId: ownerId as any });
    }

    async getOwnerPets(ownerId: string, page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }> {
        return await this.petRepository.findByOwnerId(ownerId, page, limit, search);
    }





    async getPetById(id: string): Promise<IPet> {
        const pet = await this.petRepository.findById(id);
        if (!pet) {
            throw new Error('Pet not found');
        }
        return pet;
    }





    async updatePet(id: string, ownerId: string, updateData: Partial<IPet>): Promise<IPet> {
        const pet = await this.petRepository.findById(id);
        if (!pet) {
            throw new Error('Pet not found');
        }
        if (pet.ownerId._id.toString() !== ownerId) {
            throw new Error('Unauthorized to update this pet');
        }

        
        if (updateData.name && updateData.name !== pet.name) {
            const existingPet = await this.petRepository.findByNameAndOwnerId(updateData.name, ownerId);
            if (existingPet) {
                throw new Error('You already have a pet with this name');
            }
        }
        
        if (updateData.vaccinations) {
            
            updateData.isVaccinated = updateData.vaccinations.length > 0 ? 'YES' : 'NO';
        }
        
        const updatedPet = await this.petRepository.updatePet(id, updateData);
        
        
        
        
        if (!updatedPet) {
            throw new Error('Failed to update pet');
        }
        return updatedPet;
    }









    async toggleActiveStatus(id: string, ownerId: string, isActive: boolean): Promise<IPet> {
        const pet = await this.petRepository.findById(id);
        if (!pet) {
            throw new Error('Pet not found');
        }
        if (pet.ownerId._id.toString() !== ownerId) {
            throw new Error('Unauthorized to update this pet');
        }

        const updatedPet = await this.petRepository.toggleActiveStatus(id, isActive);
        if (!updatedPet) {
            throw new Error('Failed to update pet status');
        }
        return updatedPet;
    }










    async getAllPets(page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }> {
        return await this.petRepository.findAll(page, limit, search);
    }

    async deletePet(id: string, ownerId: string): Promise<void> {
        const pet = await this.petRepository.findById(id);
        if (!pet) {
            throw new Error('Pet not found');
        }
        if (pet.ownerId._id.toString() !== ownerId) {
            throw new Error('Unauthorized to delete this pet');
        }

        const isDeleted = await this.petRepository.deletePet(id);
        if (!isDeleted) {
            throw new Error('Failed to delete pet');
        }
    }











    
}
