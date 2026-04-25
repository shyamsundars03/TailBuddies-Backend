import { IPayment, Payment } from '../models/payment.model';
import { IWallet, Wallet } from '../models/wallet.model';
import { IWalletTransaction, WalletTransaction } from '../models/wallet-transaction.model';
import { IPaymentRepository } from './interfaces/IPaymentRepository';
import { ClientSession } from 'mongoose';

export class PaymentRepository implements IPaymentRepository {
    async createPayment(paymentData: Partial<IPayment>, session?: ClientSession): Promise<IPayment> {
        const payment = new Payment(paymentData);
        return await payment.save({ session });
    }

    async updatePaymentStatus(paymentID: string, status: string, transactionID?: string, session?: ClientSession): Promise<IPayment | null> {
        const update: any = { paymentStatus: status };
        if (transactionID) update.transactionID = transactionID;
        return await Payment.findOneAndUpdate({ paymentID }, update, { new: true, session });
    }

    async getPaymentByAppointmentId(appointmentId: string): Promise<IPayment | null> {
        return await Payment.findOne({ appointmentID: appointmentId });
    }

    async getPaymentByInternalId(paymentID: string): Promise<IPayment | null> {
        return await Payment.findOne({ paymentID });
    }

    async getWalletByUserId(userId: string, session?: ClientSession): Promise<IWallet | null> {
        return await Wallet.findOne({ userId }).session(session || null);
    }

    async createWallet(walletData: Partial<IWallet>, session?: ClientSession): Promise<IWallet> {
        const wallet = new Wallet(walletData);
        return await wallet.save({ session });
    }

    async updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit', session?: ClientSession): Promise<IWallet | null> {
        const increment = type === 'credit' ? amount : -amount;
        return await Wallet.findOneAndUpdate(
            { userId },
            { $inc: { balance: increment } },
            { new: true, session }
        );
    }

    async createWalletTransaction(transactionData: Partial<IWalletTransaction>, session?: ClientSession): Promise<IWalletTransaction> {
        const transaction = new WalletTransaction(transactionData);
        return await transaction.save({ session });
    }

    async getWalletTransactions(walletId: string, page: number, limit: number): Promise<{ transactions: IWalletTransaction[], total: number }> {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            WalletTransaction.find({ walletID: walletId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            WalletTransaction.countDocuments({ walletID: walletId })
        ]);
        return { transactions, total };
    }

    async findAllWalletTransactions(page: number, limit: number, search?: string, status?: string): Promise<{ transactions: IWalletTransaction[], total: number }> {
        const skip = (page - 1) * limit;
        const query: any = {};

        if (status) {
            if (status.toLowerCase() === 'paid') {
                query.source = 'appointment-payment';
            } else if (status.toLowerCase() === 'refunded') {
                query.source = { $in: ['consultation-refund', 'prescription-refund', 'refund'] };
            } else if (status.toUpperCase() === 'PENDING') {
                query.status = 'PENDING';
            }
        }

        if (search) {
            // Find users matching search
            const users = await WalletTransaction.db.model('User').find({
                username: { $regex: search, $options: 'i' }
            }).select('_id');

            // Find wallets for those users
            const wallets = await WalletTransaction.db.model('Wallet').find({
                userId: { $in: users.map((u: any) => u._id) }
            }).select('_id');

            query.$or = [
                { transactionID: { $regex: search, $options: 'i' } },
                { walletID: { $in: wallets.map((w: any) => w._id) } }
            ];
        }

        const [transactions, total] = await Promise.all([
            WalletTransaction.find(query)
                .populate({
                    path: 'walletID',
                    populate: { path: 'userId', select: 'username email profilePic' }
                })
                .populate('appointmentID')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            WalletTransaction.countDocuments(query)
        ]);
        return { transactions, total };
    }

    async getTransactionById(id: string): Promise<IWalletTransaction | null> {
        return await WalletTransaction.findById(id)
            .populate({
                path: 'walletID',
                populate: { path: 'userId', select: 'username email profilePic' }
            })
            .populate({
                path: 'appointmentID',
                populate: [
                    { path: 'doctorId', populate: { path: 'userId', select: 'username email profilePic' } },
                    { path: 'petId' },
                    { path: 'ownerId', select: 'username email profilePic' }
                ]
            });
    }
}
