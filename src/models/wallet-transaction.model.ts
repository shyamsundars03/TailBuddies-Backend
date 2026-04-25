import mongoose, { Schema, Document } from 'mongoose';

export enum WalletTransactionSource {
    CONSULTATION_REFUND = 'consultation-refund',
    PRESCRIPTION_REFUND = 'prescription-refund',
    APPOINTMENT_REFUND = 'appointment-refund',
    WALLET_RECHARGE = 'wallet-recharge',
    APPOINTMENT_PAYMENT = 'appointment-payment',
    WITHDRAWAL = 'withdrawal'
}

export interface IWalletTransaction extends Document {
    transactionID: string;
    walletID: mongoose.Types.ObjectId;
    type: 'credit' | 'debit' | 'requested';
    status: 'PENDING' | 'COMPLETED' | 'REJECTED';
    source: WalletTransactionSource;
    amount: number;
    grossAmount?: number;
    commission?: number;
    netAmount?: number;
    paymentID?: mongoose.Types.ObjectId; // Reference to the Payment document
    appointmentID?: mongoose.Types.ObjectId; // Reference to the Appointment document
    humanReadableId?: string; // Human readable Appointment ID (e.g. API12345)
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
    {
        transactionID: { type: String, required: true, unique: true },
        walletID: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
        type: { type: String, enum: ['credit', 'debit', 'requested'], required: true },
        status: { type: String, enum: ['PENDING', 'COMPLETED', 'REJECTED'], default: 'COMPLETED' },
        source: {
            type: String,
            enum: Object.values(WalletTransactionSource),
            required: true
        },
        amount: { type: Number, required: true },
        grossAmount: { type: Number },
        commission: { type: Number },
        netAmount: { type: Number },
        paymentID: { type: Schema.Types.ObjectId, ref: 'Payment' },
        appointmentID: { type: Schema.Types.ObjectId, ref: 'Appointment' },
        humanReadableId: { type: String },
        message: { type: String }
    },
    { timestamps: true }
);

export const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
