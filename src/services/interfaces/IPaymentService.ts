import { IWallet } from '../../models/wallet.model';
import { IWalletTransaction } from '../../models/wallet-transaction.model';
import { ClientSession } from 'mongoose';

export interface RazorpayOrderResponse {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
}

export interface PaymentVerificationData {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    appointmentId: string;
}

export interface IPaymentService {
    // Razorpay logic
    createRazorpayOrder(amount: number, appointmentId: string, userId: string): Promise<{ order: RazorpayOrderResponse }>;
    verifyRazorpaySignature(verificationData: PaymentVerificationData): Promise<void>;

    // Wallet logic
    getWallet(userId: string): Promise<IWallet>;
    processWalletPayment(userId: string, amount: number, appointmentId: string): Promise<void>;
    topUpWallet(userId: string, amount: number, transactionId: string): Promise<void>;

    // Cash balance and general
    processCashPayment(appointmentId: string, userId: string): Promise<void>;
    getTransactions(userId: string, page: number, limit: number): Promise<{ transactions: IWalletTransaction[]; total: number }>;

    // Retry logic
    retryPayment(appointmentId: string, method: string): Promise<{ order: RazorpayOrderResponse } | Record<string, unknown>>;

    // Refund logic
    refund(appointmentId: string, reason: string, session?: ClientSession): Promise<void>;

    // Admin operations
    getAllTransactions(page: number, limit: number, search?: string, status?: string): Promise<{ transactions: IWalletTransaction[]; total: number }>;
    getTransactionDetail(id: string): Promise<IWalletTransaction>;

    // Doctor specific
    creditDoctorWallet(userId: string, amount: number, appointmentId: string, humanReadableId: string): Promise<void>;
    requestWithdrawal(userId: string, amount: number): Promise<void>;
    approveWithdrawal(transactionId: string): Promise<void>;
    rejectWithdrawal(transactionId: string): Promise<void>;
}
