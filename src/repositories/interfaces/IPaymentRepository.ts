import { IPayment } from '../../models/payment.model';
import { IWallet } from '../../models/wallet.model';
import { IWalletTransaction } from '../../models/wallet-transaction.model';
import { ClientSession } from 'mongoose';

export interface IPaymentRepository {
    createPayment(paymentData: Partial<IPayment>, session?: ClientSession): Promise<IPayment>;
    updatePaymentStatus(paymentID: string, status: string, transactionID?: string, session?: ClientSession): Promise<IPayment | null>;
    getPaymentByAppointmentId(appointmentId: string): Promise<IPayment | null>;
    getPaymentByInternalId(paymentID: string): Promise<IPayment | null>;
    
    // Wallet operations
    getWalletByUserId(userId: string, session?: ClientSession): Promise<IWallet | null>;
    createWallet(walletData: Partial<IWallet>, session?: ClientSession): Promise<IWallet>;
    updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit', session?: ClientSession): Promise<IWallet | null>;
    
    // Wallet Transaction
    createWalletTransaction(transactionData: Partial<IWalletTransaction>, session?: ClientSession): Promise<IWalletTransaction>;
    getWalletTransactions(walletId: string, page: number, limit: number): Promise<{ transactions: IWalletTransaction[], total: number }>;
}
