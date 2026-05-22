import { IAppointmentRepository } from '../repositories/interfaces/IAppointmentRepository';
import { IDoctorRepository } from '../repositories/interfaces/IDoctorRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IPetRepository } from '../repositories/interfaces/IPetRepository';
import { ISpecialtyRepository } from '../repositories/interfaces/ISpecialtyRepository';
import { AppointmentStatus } from '../enums/appointment-status.enum';
import { UserRole } from '../enums/user-role.enum';
// import mongoose from 'mongoose';

export interface DashboardStats {
    cards: {
        totalDoctors: number;
        totalPets: number;
        totalOwners: number;
        totalRevenue: number;
    };
    graphData: {
        labels: string[];
        revenue: number[];
        appointments: number[];
    };
}

export interface ReportItem {
    sNo: number;
    doctorId: string;
    doctorName: string;
    email: string;
    phone: string;
    profilePic: string;
    specialty: string;
    memberSince: Date;
    earned: number;
    noOfAppointments: number;
}

export interface SpecialtyStat {
    specialtyName: string;
    noOfDoctors: number;
    noOfAppointments: number;
    revenue: number;
}

export interface IAdminAnalyticsService {
    getDashboardStats(filters?: { from?: string; to?: string; grouping?: string }): Promise<DashboardStats>;
    getReportsData(filters: { from?: string; to?: string; specialtyId?: string; search?: string; page?: number; limit?: number }): Promise<{ reports: ReportItem[], total: number }>;
    getSpecialtyStats(filters: { from?: string; to?: string }): Promise<SpecialtyStat[]>;
}

export class AdminAnalyticsService implements IAdminAnalyticsService {
    private readonly _appointmentRepository: IAppointmentRepository;
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _userRepository: IUserRepository;
    private readonly _petRepository: IPetRepository;
    private readonly _specialtyRepository: ISpecialtyRepository;

    constructor(
        appointmentRepository: IAppointmentRepository,
        doctorRepository: IDoctorRepository,
        userRepository: IUserRepository,
        petRepository: IPetRepository,
        specialtyRepository: ISpecialtyRepository
    ) {
        this._appointmentRepository = appointmentRepository;
        this._doctorRepository = doctorRepository;
        this._userRepository = userRepository;
        this._petRepository = petRepository;
        this._specialtyRepository = specialtyRepository;
    }

    private _buildDateMatch(from?: string, to?: string): Record<string, Record<string, Date>> {
        const dateMatch: Record<string, Record<string, Date>> = {};
        if (from || to) {
            const range: Record<string, Date> = {};
            if (from && from.trim() !== "") {
                const fromDate = new Date(from);
                if (!isNaN(fromDate.getTime())) range.$gte = fromDate;
            }
            if (to && to.trim() !== "") {
                const toDate = new Date(to);
                if (!isNaN(toDate.getTime())) range.$lte = toDate;
            }
            if (Object.keys(range).length > 0) {
                dateMatch.appointmentDate = range;
            }
        }
        return dateMatch;
    }
    async getDashboardStats(filters: { from?: string; to?: string; grouping?: string } = {}): Promise<DashboardStats> {
        try {
            const { from, to, grouping = 'month' } = filters;

            // Base match for date range
            const dateMatch = this._buildDateMatch(from, to);

            const [totalDoctors, totalPets, totalOwners, totalRevenueResult] = await Promise.all([
                this._doctorRepository.countDocuments(),
                this._petRepository.countDocuments(),
                this._userRepository.countDocuments({ role: UserRole.OWNER }),
                this._appointmentRepository.aggregate([
                    { $match: { status: AppointmentStatus.COMPLETED, paymentStatus: 'PAID', ...dateMatch } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
                ]) as Promise<{ total: number }[]>
            ]);

            // console.log('[AdminAnalyticsService] Counts:', { totalDoctors, totalPets, totalOwners, totalRevenueResult });

            const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

            // Define grouping logic for graph
            let idConfig: Record<string, unknown> = {};
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

            const stats = await this._appointmentRepository.getRevenueStats(
                {
                    status: { $ne: 'cancelled' },
                    paymentStatus: 'PAID',
                    ...dateMatch
                },
                idConfig,
                labelFormat
            ) as { label: string; revenue: number; appointments: number }[];

            const graphData = {
                labels: stats.map(s => s.label),
                revenue: stats.map(s => s.revenue),
                appointments: stats.map(s => s.appointments)
            };

            return {
                cards: { totalDoctors, totalPets, totalOwners, totalRevenue },
                graphData
            };
        } catch (error: unknown) {
            console.error('Error in AdminAnalyticsService.getDashboardStats:', error);
            throw error;
        }
    }

    async getReportsData(filters: { from?: string; to?: string; specialtyId?: string; search?: string; page?: number; limit?: number }): Promise<{ reports: ReportItem[], total: number }> {
        const { from, to, specialtyId, search, page = 1, limit = 10 } = filters;
        const skip = (page - 1) * limit;
        const dateMatch = this._buildDateMatch(from, to);
        const match: Record<string, unknown> = {
            status: AppointmentStatus.COMPLETED,
            paymentStatus: 'PAID',
            ...dateMatch
        };

        const result = await this._appointmentRepository.getReportsData(match, search, specialtyId, skip, limit) as {
            data: {
                _id: string;
                user: { username: string; email: string; phone: string; profilePic: string; createdAt: Date };
                specialty?: { name: string };
                totalEarned: number;
                noOfAppointments: number;
            }[],
            total: number
        };

        const reports = result.data.map((r, i) => ({
            sNo: skip + i + 1,
            doctorId: r._id,
            doctorName: r.user.username,
            email: r.user.email,
            phone: r.user.phone,
            profilePic: r.user.profilePic,
            specialty: r.specialty?.name || 'General',
            memberSince: r.user.createdAt,
            earned: r.totalEarned,
            noOfAppointments: r.noOfAppointments
        }));

        return { reports, total: result.total };
    }

    async getSpecialtyStats(filters: { from?: string; to?: string }): Promise<SpecialtyStat[]> {
        const { from, to } = filters;
        const dateMatch = this._buildDateMatch(from, to);
        const match: Record<string, unknown> = { 
            status: AppointmentStatus.COMPLETED,
            ...dateMatch
        };

        // Get all specialties
        const specialties = await this._specialtyRepository.findAll();
        const stats = await Promise.all(specialties.map(async (spec) => {
            const doctors = await this._doctorRepository.findAll({ "profile.specialtyId": spec._id });
            const doctorIds = doctors.map(d => (d as unknown as { _id: string })._id);

            const appointments = await this._appointmentRepository.aggregate([
                { $match: { ...match, doctorId: { $in: doctorIds } } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalAmount" }
                    }
                }
            ]) as { count: number; revenue: number }[];

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
