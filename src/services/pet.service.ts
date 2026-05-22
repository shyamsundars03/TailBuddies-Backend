import { IPet } from '../models/pet.model';
import mongoose from 'mongoose';
import { IPetRepository } from '../repositories/interfaces/IPetRepository';
import { IPetService } from './interfaces/IPetService';
import { AppError, NotFoundError, ForbiddenError, ConflictError } from '../errors/app-error';
import { HttpStatus } from '../constants';

export class PetService implements IPetService {
    private readonly _petRepository: IPetRepository;

    constructor(petRepository: IPetRepository) {
        this._petRepository = petRepository;
    }

    async addPet(ownerId: string, petData: Partial<IPet>): Promise<IPet> {
        if (petData.name) {
            const existingPet = await this._petRepository.findByNameAndOwnerId(petData.name, ownerId);
            if (existingPet) {
                throw new ConflictError('You already have a pet with this name');
            }
        }

        if (petData.vaccinations && petData.vaccinations.length > 0) {
            petData.isVaccinated = 'YES';
        } else {
            petData.isVaccinated = 'NO';
        }

        return await this._petRepository.createPet({ ...petData, ownerId: new mongoose.Types.ObjectId(ownerId) } as unknown as Partial<IPet>);
    }

    async getOwnerPets(ownerId: string, page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }> {
        return await this._petRepository.findByOwnerId(ownerId, page, limit, search);
    }

    async getPetById(id: string): Promise<IPet> {
        const pet = await this._petRepository.findById(id);
        if (!pet) {
            throw new NotFoundError('Pet not found');
        }
        return pet;
    }

    async updatePet(id: string, ownerId: string, updateData: Partial<IPet>): Promise<IPet> {
        const pet = await this._petRepository.findById(id);
        if (!pet) {
            throw new NotFoundError('Pet not found');
        }
        
        const petOwnerId = this.extractId(pet.ownerId);
        if (petOwnerId !== ownerId) {
            throw new ForbiddenError('Unauthorized to update this pet');
        }

        if (updateData.name && updateData.name !== pet.name) {
            const existingPet = await this._petRepository.findByNameAndOwnerId(updateData.name, ownerId);
            if (existingPet) {
                throw new ConflictError('You already have a pet with this name');
            }
        }

        if (updateData.vaccinations) {
            updateData.isVaccinated = updateData.vaccinations.length > 0 ? 'YES' : 'NO';
        }

        const updatedPet = await this._petRepository.updatePet(id, updateData);
        if (!updatedPet) {
            throw new AppError('Failed to update pet', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return updatedPet;
    }

    async toggleActiveStatus(id: string, ownerId: string, isActive: boolean): Promise<IPet> {
        const pet = await this._petRepository.findById(id);
        if (!pet) {
            throw new NotFoundError('Pet not found');
        }
        
        const petOwnerId = this.extractId(pet.ownerId);
        if (petOwnerId !== ownerId) {
            throw new ForbiddenError('Unauthorized to update this pet');
        }

        const updatedPet = await this._petRepository.toggleActiveStatus(id, isActive);
        if (!updatedPet) {
            throw new AppError('Failed to update pet status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return updatedPet;
    }

    async getAllPets(page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }> {
        return await this._petRepository.findAll(page, limit, search);
    }

    async deletePet(id: string, ownerId: string): Promise<void> {
        const pet = await this._petRepository.findById(id);
        if (!pet) {
            throw new NotFoundError('Pet not found');
        }
        
        const petOwnerId = this.extractId(pet.ownerId);
        if (petOwnerId !== ownerId) {
            throw new ForbiddenError('Unauthorized to delete this pet');
        }

        const isDeleted = await this._petRepository.deletePet(id);
        if (!isDeleted) {
            throw new AppError('Failed to delete pet', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private extractId(value: string | mongoose.Types.ObjectId | { _id: string | mongoose.Types.ObjectId }): string {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value instanceof mongoose.Types.ObjectId) return value.toString();
        if (typeof value === 'object' && '_id' in value) return value._id.toString();
        return String(value);
    }
}
