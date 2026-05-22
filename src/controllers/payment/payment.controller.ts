import { Response } from 'express';
import { IPaymentService } from '../../services/interfaces/IPaymentService';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import { CreateOrderSchema, VerifyPaymentSchema, WithdrawRequestSchema, RetryPaymentSchema } from '../../dto/payment/payment.schema';
import { UnauthorizedError } from '../../errors/app-error';

export class PaymentController {
    private readonly _paymentService: IPaymentService;

    constructor(paymentService: IPaymentService) {
        this._paymentService = paymentService;
    }

    createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { amount, appointmentId } = CreateOrderSchema.parse(req.body);
        const result = await this._paymentService.createRazorpayOrder(amount, appointmentId, userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Order created', result));
    };

    verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const data = VerifyPaymentSchema.parse(req.body);
        await this._paymentService.verifyRazorpaySignature(data);
        res.status(HttpStatus.OK).json(ApiResponse.success('Payment verified successfully'));
    };

    getWallet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const result = await this._paymentService.getWallet(userId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Wallet fetched', result));
    };

    payWithWallet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { amount, appointmentId } = CreateOrderSchema.parse(req.body);
        await this._paymentService.processWalletPayment(userId, amount, appointmentId);
        res.status(HttpStatus.OK).json(ApiResponse.success('Payment successful using wallet'));
    };

    getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this._paymentService.getTransactions(userId, page, limit);
        res.status(HttpStatus.OK).json(ApiResponse.success('Transactions fetched', {
            items: result.transactions,
            total: result.total,
            page,
            limit
        }));
    };

    retryPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { appointmentId, method } = RetryPaymentSchema.parse(req.body);
        const result = await this._paymentService.retryPayment(appointmentId, method);
        res.status(HttpStatus.OK).json(ApiResponse.success('Retry details fetched', result));
    };

    getAllTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;

        const result = await this._paymentService.getAllTransactions(page, limit, search, status);
        res.status(HttpStatus.OK).json(ApiResponse.success('All transactions fetched', {
            items: result.transactions,
            total: result.total,
            page,
            limit
        }));
    };

    getTransactionDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = req.params.id as string;
        const result = await this._paymentService.getTransactionDetail(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Transaction details fetched', result));
    };

    requestWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { amount } = WithdrawRequestSchema.parse(req.body);
        await this._paymentService.requestWithdrawal(userId, amount);
        res.status(HttpStatus.OK).json(ApiResponse.success('Withdrawal request submitted for Admin approval'));
    };

    approveWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = String(req.params.id);
        await this._paymentService.approveWithdrawal(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Withdrawal approved successfully'));
    };

    rejectWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = String(req.params.id);
        await this._paymentService.rejectWithdrawal(id);
        res.status(HttpStatus.OK).json(ApiResponse.success('Withdrawal request rejected'));
    };
}
