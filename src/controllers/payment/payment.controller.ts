import { Response, NextFunction } from 'express';
import { IPaymentService } from '../../services/interfaces/IPaymentService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';

export class PaymentController {
    private readonly _paymentService: IPaymentService;

    constructor(paymentService: IPaymentService) {
        this._paymentService = paymentService;
    }

    createOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { amount, appointmentId } = req.body;
            const result = await this._paymentService.createRazorpayOrder(amount, appointmentId, userId);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    verifyPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this._paymentService.verifyRazorpaySignature(req.body);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._paymentService.getWallet(userId);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    payWithWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { amount, appointmentId } = req.body;
            const result = await this._paymentService.processWalletPayment(userId, amount, appointmentId);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await this._paymentService.getTransactions(userId, page, limit);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    retryPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { appointmentId, method } = req.body;
            const result = await this._paymentService.retryPayment(appointmentId, method);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getAllTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const status = req.query.status as string;

            const result = await this._paymentService.getAllTransactions(page, limit, search, status);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    getTransactionDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = req.params.id as string;
            const result = await this._paymentService.getTransactionDetail(id);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    requestWithdrawal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { amount } = req.body;
            const result = await this._paymentService.requestWithdrawal(userId, amount);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    approveWithdrawal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = String(req.params.id);
            const result = await this._paymentService.approveWithdrawal(id);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };

    rejectWithdrawal = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = String(req.params.id);
            const result = await this._paymentService.rejectWithdrawal(id);
            res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            next(error);
        }
    };
}
