import { Router } from 'express';
import { paymentController } from '../config/di';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';

const router = Router();

router.post('/razorpay/order', authMiddleware, paymentController.createOrder);
router.post('/razorpay/verify', authMiddleware, paymentController.verifyPayment);
router.get('/wallet', authMiddleware, paymentController.getWallet);
router.post('/wallet/pay', authMiddleware, paymentController.payWithWallet);
router.get('/transactions', authMiddleware, paymentController.getTransactions);
router.get('/admin/transactions', authMiddleware, adminOnly, paymentController.getAllTransactions);
router.get('/admin/transactions/:id', authMiddleware, adminOnly, paymentController.getTransactionDetail);
router.post('/retry', authMiddleware, paymentController.retryPayment);

export default router;
