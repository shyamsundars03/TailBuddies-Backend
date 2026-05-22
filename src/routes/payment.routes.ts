import { Router, RequestHandler } from 'express';
import { paymentController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/zod-validation.middleware';
import {
    CreateOrderSchema,
    VerifyPaymentSchema,
    WithdrawRequestSchema,
    RetryPaymentSchema,
} from '../dto/payment/payment.schema';

const router = Router();

router.post('/razorpay/order', authMiddleware as unknown as RequestHandler, validateRequest(CreateOrderSchema), paymentController.createOrder);
router.post('/razorpay/verify', authMiddleware as unknown as RequestHandler, validateRequest(VerifyPaymentSchema), paymentController.verifyPayment);
router.get('/wallet', authMiddleware as unknown as RequestHandler, paymentController.getWallet);
router.post('/wallet/pay', authMiddleware as unknown as RequestHandler, validateRequest(CreateOrderSchema), paymentController.payWithWallet);
router.get('/transactions', authMiddleware as unknown as RequestHandler, paymentController.getTransactions);
router.post('/retry', authMiddleware as unknown as RequestHandler, validateRequest(RetryPaymentSchema), paymentController.retryPayment);
router.post('/wallet/withdraw/request', authMiddleware as unknown as RequestHandler, validateRequest(WithdrawRequestSchema), paymentController.requestWithdrawal);

// Admin routes
router.get('/admin/transactions', authMiddleware as unknown as RequestHandler, adminOnly as unknown as RequestHandler, paymentController.getAllTransactions);
router.get('/admin/transactions/:id', authMiddleware as unknown as RequestHandler, adminOnly as unknown as RequestHandler, paymentController.getTransactionDetail);
router.patch('/admin/transactions/:id/approve', authMiddleware as unknown as RequestHandler, adminOnly as unknown as RequestHandler, paymentController.approveWithdrawal);
router.patch('/admin/transactions/:id/reject', authMiddleware as unknown as RequestHandler, adminOnly as unknown as RequestHandler, paymentController.rejectWithdrawal);

export default router;
