import mongoose, { PipelineStage } from 'mongoose';
import { Appointment, IAppointment } from '../models/appointment.model';
import { BaseRepository } from './base/base.repository';
import { IAppointmentRepository } from './interfaces/IAppointmentRepository';

export class AppointmentRepository extends BaseRepository<IAppointment> implements IAppointmentRepository {




  constructor() {
    super(Appointment);
  }

  async findById(id: string): Promise<IAppointment | null> {
    return await this._model.findById(id)
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
      .populate('cancellation.cancelledBy', 'username email');
  }

  async findWithDetails(query: Record<string, unknown>): Promise<IAppointment[]> {
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
      .populate('cancellation.cancelledBy', 'username email')
      .sort({ createdAt: -1 }); // Recently created first
  }

  async findWithPagination(query: Record<string, unknown>, page: number, limit: number): Promise<{ items: IAppointment[], total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
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
        .populate('cancellation.cancelledBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this._model.countDocuments(query)
    ]);

    return { items, total };
  }



  async aggregate(pipeline: PipelineStage[]): Promise<unknown[]> {
    return await this._model.aggregate(pipeline);
  }

  async getRevenueStats(match: Record<string, unknown>, idConfig: Record<string, unknown>, labelFormat: string): Promise<unknown[]> {
    return await this._model.aggregate([
      { $match: match },
      {
        $group: {
          _id: idConfig,
          revenue: { $sum: "$totalAmount" },
          appointments: { $sum: 1 },
          date: { $first: "$appointmentDate" }
        }
      },
      { $sort: { "date": 1 } },
      {
        $project: {
          _id: 0,
          label: { $dateToString: { format: labelFormat, date: "$date" } },
          revenue: 1,
          appointments: 1
        }
      }
    ]);
  }

  async getReportsData(match: Record<string, unknown>, search?: string, specialtyId?: string, skip: number = 0, limit: number = 10): Promise<unknown> {
    const aggregation: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: "$doctorId",
          noOfAppointments: { $sum: 1 },
          totalEarned: { $sum: "$totalAmount" }
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: "$doctor" },
      {
        $lookup: {
          from: 'users',
          localField: 'doctor.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: 'specialties',
          localField: 'doctor.profile.specialtyId',
          foreignField: '_id',
          as: 'specialty'
        }
      },
      { $unwind: { path: "$specialty", preserveNullAndEmptyArrays: true } }
    ];

    if (specialtyId && mongoose.Types.ObjectId.isValid(specialtyId)) {
      aggregation.push({ $match: { "doctor.profile.specialtyId": new mongoose.Types.ObjectId(specialtyId) } });
    }

    if (search) {
      aggregation.push({
        $match: {
          $or: [
            { "user.username": { $regex: search, $options: 'i' } },
            { "specialty.name": { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add facet for data and total count
    aggregation.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit }
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
    });

    const result = await this._model.aggregate(aggregation);
    return {
      data: result[0].data,
      total: result[0].totalCount[0]?.count || 0
    };
  }

  async findOneWithSession(filter: Record<string, unknown>, session: any): Promise<IAppointment | null> {
    return await this._model.findOne(filter).session(session);
  }
}
