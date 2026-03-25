import { IAppointment } from '../../models/appointment.model';
import { IBaseRepository } from '../base/base.repository.interface';

export interface IAppointmentRepository extends IBaseRepository<IAppointment> {
  
  
  findWithDetails(query: any): Promise<IAppointment[]>;
  findWithPagination(query: any, page: number, limit: number): Promise<{ appointments: IAppointment[], total: number }>;
}
