import mongoose from 'mongoose';
import { Appointment } from '../models/appointment.model';
import { User } from '../models/user.models';
import { Pet } from '../models/pet.model';
import { Doctor } from '../models/doctor.model';
import { Specialty } from '../models/specialty.model';
import { AppointmentStatus } from '../enums/appointment-status.enum';

export interface IAdminAnalyticsService {
    getDashboardStats(): Promise<any>;
    getReportsData(filters: { from?: string; to?: string; specialtyId?: string; search?: string }): Promise<any>;
    getSpecialtyStats(filters: { from?: string; to?: string }): Promise<any>;
}

export class AdminAnalyticsService implements IAdminAnalyticsService {
    async getDashboardStats(): Promise<any> {
        const [totalDoctors, totalPets, totalOwners, revenueResult] = await Promise.all([
            Doctor.countDocuments(),
            Pet.countDocuments(),
            User.countDocuments({ role: 'owner' }),
            Appointment.aggregate([
                { $match: { status: AppointmentStatus.COMPLETED } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const graphData = await Appointment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: AppointmentStatus.COMPLETED } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    appointments: { $sum: 1 },
                    revenue: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        return {
            cards: { totalDoctors, totalPets, totalOwners, totalRevenue },
            graphData: graphData.map(d => ({
                month: new Date(d._id.year, d._id.month - 1).toLocaleString('default', { month: 'short' }),
                appointments: d.appointments,
                revenue: d.revenue
            }))
        };
    }

    async getReportsData(filters: any): Promise<any> {
        const { from, to, specialtyId, search } = filters;
        const match: any = { status: AppointmentStatus.COMPLETED };

        if (from || to) {
            match.appointmentDate = {};
            if (from) match.appointmentDate.$gte = new Date(from);
            if (to) match.appointmentDate.$lte = new Date(to);
        }

        const aggregation: any[] = [
            { $match: match },
            {
                $group: {
                    _id: "$doctorId",
                    noOfAppointments: { $sum: 1 },
                    totalEarned: { $sum: "$amount" }
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

        if (specialtyId) {
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

        const reports = await Appointment.aggregate(aggregation);

        return reports.map((r, i) => ({
            sNo: i + 1,
            doctorId: r._id,
            doctorName: r.user.username,
            profilePic: r.user.profilePic,
            specialty: r.specialty?.name || 'General',
            memberSince: r.user.createdAt,
            earned: r.totalEarned,
            noOfAppointments: r.noOfAppointments
        }));
    }

    async getSpecialtyStats(filters: any): Promise<any> {
        const { from, to } = filters;
        const match: any = { status: AppointmentStatus.COMPLETED };

        if (from || to) {
            match.appointmentDate = {};
            if (from) match.appointmentDate.$gte = new Date(from);
            if (to) match.appointmentDate.$lte = new Date(to);
        }

        // Get all specialties
        const specialties = await Specialty.find();
        const stats = await Promise.all(specialties.map(async (spec) => {
            const doctors = await Doctor.find({ "profile.specialtyId": spec._id }).select('_id');
            const doctorIds = doctors.map(d => d._id);

            const appointments = await Appointment.aggregate([
                { $match: { ...match, doctorId: { $in: doctorIds } } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        revenue: { $sum: "$amount" }
                    }
                }
            ]);

            return {
                specialtyName: spec.name,
                noOfDoctors: doctorIds.length,
                noOfAppointments: appointments.length > 0 ? appointments[0].count : 0,
                revenue: appointments.length > 0 ? appointments[0].revenue : 0
            };
        }));

        return stats;
    }
}
