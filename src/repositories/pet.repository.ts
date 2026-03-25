import { IPet, Pet } from '../models/pet.model';
import { IPetRepository } from './interfaces/IPetRepository';

export class PetRepository implements IPetRepository {
   
   
   
   
    async createPet(petData: Partial<IPet>): Promise<IPet> {
        const pet = new Pet(petData);
        return await pet.save();
    }





    async findById(id: string): Promise<IPet | null> {
        return await Pet.findById(id).populate('ownerId', 'userName email phone profilePic');
    }





    async findByOwnerId(ownerId: string, page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }> {
        const query: any = { ownerId };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { species: { $regex: search, $options: 'i' } },
                { breed: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const [pets, total] = await Promise.all([
            Pet.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Pet.countDocuments(query)
        ]);

        return { pets, total };
    }





    async findAll(page: number, limit: number, search?: string): Promise<{ pets: IPet[]; total: number }> {
        const query: any = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { species: { $regex: search, $options: 'i' } },
                { breed: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const [pets, total] = await Promise.all([
            Pet.find(query).populate('ownerId', 'userName email phone profilePic').skip(skip).limit(limit).sort({ createdAt: -1 }),
            Pet.countDocuments(query)
        ]);

        return { pets, total };
    }




    async updatePet(id: string, updateData: Partial<IPet>): Promise<IPet | null> {
        return await Pet.findByIdAndUpdate(id, updateData, { new: true });
    }




    async toggleActiveStatus(id: string, isActive: boolean): Promise<IPet | null> {
        return await Pet.findByIdAndUpdate(id, { isActive }, { new: true });
    }




    async findByNameAndOwnerId(name: string, ownerId: string): Promise<IPet | null> {
        return await Pet.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }, 
            ownerId 
        });
    }



    async deletePet(id: string): Promise<boolean> {
        const result = await Pet.findByIdAndDelete(id);
        return result !== null;
    }



    
}
