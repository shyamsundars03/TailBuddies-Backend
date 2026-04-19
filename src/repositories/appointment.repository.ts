import { Appointment, IAppointment } from '../models/appointment.model';
import { BaseRepository } from './base/base.repository';
import { IAppointmentRepository } from './interfaces/IAppointmentRepository';

export class AppointmentRepository extends BaseRepository<IAppointment> implements IAppointmentRepository {




  constructor() {
    super(Appointment);
  }

  async findWithDetails(query: any): Promise<IAppointment[]> {
    return await this._model.find(query)
      .populate('ownerId', 'username email phone')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'username email profilePic'
        }
      })
      .populate('petId', 'name species breed gender age weight picture')
      .populate('prescriptionId')
      .sort({ createdAt: -1 }); // Recently created first
  }





  async findWithPagination(query: any, page: number, limit: number): Promise<{ appointments: IAppointment[], total: number }> {
    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      this._model.find(query)
        .populate('ownerId', 'username email phone')
        .populate({
          path: 'doctorId',
          populate: {
            path: 'userId',
            select: 'username email profilePic'
          }
        })
        .populate('petId', 'name species breed gender age weight picture')
        .populate('prescriptionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this._model.countDocuments(query)
    ]);

    return { appointments, total };
  }



  
}
