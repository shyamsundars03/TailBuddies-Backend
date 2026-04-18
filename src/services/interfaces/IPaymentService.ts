import { IPayment } from '../../models/payment.model';
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
    createRazorpayOrder(amount: number, appointmentId: string, userId: string): Promise<{ success: boolean; order?: any; message?: string }>;
    verifyRazorpaySignature(verificationData: PaymentVerificationData): Promise<{ success: boolean; message: string }>;
    
    // Wallet logic
    getWallet(userId: string): Promise<{ success: boolean; wallet?: IWallet; message?: string }>;
    processWalletPayment(userId: string, amount: number, appointmentId: string): Promise<{ success: boolean; message: string }>;
    topUpWallet(userId: string, amount: number, transactionId: string): Promise<{ success: boolean; message: string }>;
    
    // Cash balance and general
    processCashPayment(appointmentId: string, userId: string): Promise<{ success: boolean; message: string }>;
    getTransactions(userId: string, page: number, limit: number): Promise<{ success: boolean; transactions?: IWalletTransaction[]; total?: number; message?: string }>;
    
    // Retry logic
    retryPayment(appointmentId: string, method: string): Promise<{ success: boolean; order?: any; message?: string }>;
    
    // Refund logic
    refund(appointmentId: string, reason: string): Promise<{ success: boolean; message: string }>;

    // Admin operations
    getAllTransactions(page: number, limit: number, search?: string, status?: string): Promise<{ success: boolean; transactions?: IWalletTransaction[]; total?: number; message?: string }>;
    getTransactionDetail(id: string): Promise<{ success: boolean; transaction?: IWalletTransaction; message?: string }>;
}
