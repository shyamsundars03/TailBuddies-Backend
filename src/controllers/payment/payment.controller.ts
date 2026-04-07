import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { IPaymentService } from '../../services/interfaces/IPaymentService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';

export class PaymentController {
    private readonly _paymentService: IPaymentService;

    constructor(paymentService: IPaymentService) {
        this._paymentService = paymentService;
    }

    createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { amount, appointmentId } = req.body;
            const result = await this._paymentService.createRazorpayOrder(amount, appointmentId, userId);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error in createOrder controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const result = await this._paymentService.verifyRazorpaySignature(req.body);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error in verifyPayment controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await this._paymentService.getWallet(userId);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error in getWallet controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    payWithWallet = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { amount, appointmentId } = req.body;
            const result = await this._paymentService.processWalletPayment(userId, amount, appointmentId);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error in payWithWallet controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await this._paymentService.getTransactions(userId, page, limit);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error in getTransactions controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };

    retryPayment = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { appointmentId, method } = req.body;
            const result = await this._paymentService.retryPayment(appointmentId, method);
            if (result.success) {
                res.status(HttpStatus.OK).json(result);
                return;
            }
            res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Error in retryPayment controller', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    };
}
