export interface IBaseRepository<T> {
  readonly model: any;
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  findAll(filter?: Record<string, unknown>, options?: Record<string, unknown>): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
}