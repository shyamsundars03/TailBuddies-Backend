import mongoose from 'mongoose';
import { Appointment } from '../models/appointment.model';
import { User } from '../models/user.models';
import { Pet } from '../models/pet.model';
import { Doctor } from '../models/doctor.model';
import { Specialty } from '../models/specialty.model';
import { AppointmentStatus } from '../enums/appointment-status.enum';

export interface IAdminAnalyticsService {
    getDashboardStats(filters?: { from?: string; to?: string; grouping?: string }): Promise<any>;
    getReportsData(filters: { from?: string; to?: string; specialtyId?: string; search?: string }): Promise<any>;
    getSpecialtyStats(filters: { from?: string; to?: string }): Promise<any>;
}

export class AdminAnalyticsService implements IAdminAnalyticsService {
    async getDashboardStats(filters: { from?: string; to?: string; grouping?: string } = {}): Promise<any> {
        try {
            const { from, to, grouping = 'month' } = filters;

            // Base match for date range
            const dateMatch: any = {};
            if (from || to) {
                dateMatch.appointmentDate = {};
                if (from && from.trim() !== "") {
                    const fromDate = new Date(from);
                    if (!isNaN(fromDate.getTime())) dateMatch.appointmentDate.$gte = fromDate;
                }
                if (to && to.trim() !== "") {
                    const toDate = new Date(to);
                    if (!isNaN(toDate.getTime())) dateMatch.appointmentDate.$lte = toDate;
                }
                // If the object is empty after checks, remove it
                if (Object.keys(dateMatch.appointmentDate).length === 0) delete dateMatch.appointmentDate;
            }

            const [totalDoctors, totalPets, totalOwners, totalRevenueResult] = await Promise.all([
                Doctor.countDocuments(),
                Pet.countDocuments(),
                User.countDocuments({ role: 'owner' }),
                Appointment.aggregate([
                    { $match: { status: AppointmentStatus.COMPLETED, paymentStatus: 'PAID', ...dateMatch } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
                ])
            ]);

            const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

            // Define grouping logic for graph
            let idConfig: any = {};
            let labelFormat: string = '';

            switch (grouping) {
                case 'day':
                    idConfig = {
                        year: { $year: "$appointmentDate" },
                        month: { $month: "$appointmentDate" },
                        day: { $dayOfMonth: "$appointmentDate" }
                    };
                    labelFormat = '%d %b';
                    break;
                case 'year':
                    idConfig = { year: { $year: "$appointmentDate" } };
                    labelFormat = '%Y';
                    break;
                case 'month':
                default:
                    idConfig = {
                        year: { $year: "$appointmentDate" },
                        month: { $month: "$appointmentDate" }
                    };
                    labelFormat = '%b %Y';
                    break;
            }

            const stats = await Appointment.aggregate([
                {
                    $match: {
                        status: { $ne: 'cancelled' },
                        ...dateMatch
                    }
                },
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

            const graphData = {
                labels: stats.map(s => s.label),
                revenue: stats.map(s => s.revenue),
                appointments: stats.map(s => s.appointments)
            };

            return {
                cards: { totalDoctors, totalPets, totalOwners, totalRevenue },
                graphData
            };
        } catch (error: any) {
            console.error('Error in AdminAnalyticsService.getDashboardStats:', error);
            throw error;
        }
    }

    async getReportsData(filters: any): Promise<any> {
        const { from, to, specialtyId, search } = filters;
        const match: any = {
            status: AppointmentStatus.COMPLETED,
            paymentStatus: 'PAID'
        };

        if (from || to) {
            match.appointmentDate = {};
            if (from && from.trim() !== "") {
                const fromDate = new Date(from);
                if (!isNaN(fromDate.getTime())) match.appointmentDate.$gte = fromDate;
            }
            if (to && to.trim() !== "") {
                const toDate = new Date(to);
                if (!isNaN(toDate.getTime())) match.appointmentDate.$lte = toDate;
            }
            if (Object.keys(match.appointmentDate).length === 0) delete match.appointmentDate;
        }

        const aggregation: any[] = [
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
            if (from && from.trim() !== "") {
                const fromDate = new Date(from);
                if (!isNaN(fromDate.getTime())) match.appointmentDate.$gte = fromDate;
            }
            if (to && to.trim() !== "") {
                const toDate = new Date(to);
                if (!isNaN(toDate.getTime())) match.appointmentDate.$lte = toDate;
            }
            if (Object.keys(match.appointmentDate).length === 0) delete match.appointmentDate;
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
                        revenue: { $sum: "$totalAmount" }
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
