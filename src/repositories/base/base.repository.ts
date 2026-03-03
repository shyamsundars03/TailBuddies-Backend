import { Model, Document, FilterQuery, QueryOptions } from 'mongoose';
import { IBaseRepository } from './base.repository.interface';

export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {



  constructor(protected readonly model: Model<T>) { }


  async create(data: Partial<T>): Promise<T> {
    const entity = new this.model(data);
    return await entity.save();
  }


  async findById(id: string): Promise<T | null> {
    return await this.model.findById(id);
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return await this.model.findOne(filter);
  }

  async findAll(filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<T[]> {
    return await this.model.find(filter, null, options);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return await this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }
}