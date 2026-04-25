import { Request, Response } from 'express';
import { IAdminAnalyticsService } from '../../services/admin-analytics.service';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class AdminAnalyticsController {
    private readonly _analyticsService: IAdminAnalyticsService;

    constructor(analyticsService: IAdminAnalyticsService) {
        this._analyticsService = analyticsService;
    }

    getDashboardStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this._analyticsService.getDashboardStats();
            res.status(HttpStatus.OK).json({ success: true, ...stats });
        } catch (error: any) {
            logger.error('Error fetching dashboard stats', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    getReports = async (req: Request, res: Response): Promise<void> => {
        try {
            const { from, to, specialtyId, search } = req.query;
            const reports = await this._analyticsService.getReportsData({
                from: from as string,
                to: to as string,
                specialtyId: specialtyId as string,
                search: search as string
            });
            res.status(HttpStatus.OK).json({ success: true, reports });
        } catch (error: any) {
            logger.error('Error fetching reports', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    getSpecialtyStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { from, to } = req.query;
            const stats = await this._analyticsService.getSpecialtyStats({
                from: from as string,
                to: to as string
            });
            res.status(HttpStatus.OK).json({ success: true, stats });
        } catch (error: any) {
            logger.error('Error fetching specialty stats', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };
}
