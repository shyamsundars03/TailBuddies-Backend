import { Response } from 'express';
import { IAdminAnalyticsService } from '../../services/admin-analytics.service';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import {
    DashboardStatsQueryInput,
    ReportsQueryInput,
    SpecialtyStatsQueryInput,
} from '../../dto/admin/admin-analytics.schema';

export class AdminAnalyticsController {
    private readonly _analyticsService: IAdminAnalyticsService;

    constructor(analyticsService: IAdminAnalyticsService) {
        this._analyticsService = analyticsService;
    }

    getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { from, to, grouping } = req.query as unknown as DashboardStatsQueryInput;
        const result = await this._analyticsService.getDashboardStats({ from, to, grouping });

        res.status(HttpStatus.OK).json(ApiResponse.success('Dashboard stats fetched', {
            cards: result.cards || { totalDoctors: 0, totalPets: 0, totalOwners: 0, totalRevenue: 0 },
            graphData: result.graphData || { labels: [], revenue: [], appointments: [] },
        }));
    };

    getReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const query = (req.validatedQuery ?? req.query) as ReportsQueryInput;
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const result = await this._analyticsService.getReportsData({
            from: query.from,
            to: query.to,
            specialtyId: query.specialtyId,
            search: query.search,
            page,
            limit,
        });

        res.status(HttpStatus.OK).json(ApiResponse.success('Reports data fetched', {
            reports: result.reports || [],
            total: result.total || 0,
        }));
    };

    getSpecialtyStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { from, to } = req.query as unknown as SpecialtyStatsQueryInput;
        const stats = await this._analyticsService.getSpecialtyStats({ from, to });

        res.status(HttpStatus.OK).json(ApiResponse.success('Specialty stats fetched', {
            stats: stats || [],
        }));
    };
}
