import { Model, Document, FilterQuery, QueryOptions } from 'mongoose';
import { IBaseRepository } from './base.repository.interface';

export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {



  protected readonly _model: Model<T>;

  constructor(model: Model<T>) {
    this._model = model;
  }


  async create(data: Partial<T>): Promise<T> {
    const entity = new this._model(data);
    return await entity.save();
  }


  async findById(id: string): Promise<T | null> {
    return await this._model.findById(id);
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return await this._model.findOne(filter);
  }

  async findAll(filter: FilterQuery<T> = {}, options: QueryOptions = {}): Promise<T[]> {
    return await this._model.find(filter, null, options);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return await this._model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this._model.findByIdAndDelete(id);
    return result !== null;
  }
}