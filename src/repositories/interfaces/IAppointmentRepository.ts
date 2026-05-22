import mongoose, { PipelineStage } from 'mongoose';
import { IAppointment } from '../../models/appointment.model';
import { IBaseRepository } from '../base/base.repository.interface';

export interface IAppointmentRepository extends IBaseRepository<IAppointment> {
  findWithDetails(query: Record<string, unknown>): Promise<IAppointment[]>;
  findWithPagination(query: Record<string, unknown>, page: number, limit: number): Promise<{ items: IAppointment[], total: number }>;
  countDocuments(query?: Record<string, unknown>): Promise<number>;

  // Analytics
  getRevenueStats(match: Record<string, unknown>, idConfig: Record<string, unknown>, labelFormat: string): Promise<unknown[]>;
  getReportsData(match: Record<string, unknown>, search?: string, specialtyId?: string, skip?: number, limit?: number): Promise<unknown>;
  aggregate(pipeline: PipelineStage[]): Promise<unknown[]>;
  findOneWithSession(filter: Record<string, unknown>, session: mongoose.ClientSession): Promise<IAppointment | null>;
}
