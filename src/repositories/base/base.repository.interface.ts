export interface IBaseRepository<T> {
  readonly model: unknown;
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Record<string, unknown>): Promise<T | null>;
  findAll(filter?: Record<string, unknown>, options?: Record<string, unknown>): Promise<T[]>;
  findWithPagination(filter: Record<string, unknown>, page: number, limit: number, sort?: Record<string, number>): Promise<{ items: T[], total: number }>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
}