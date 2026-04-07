import mongoose, { Schema, Document } from 'mongoose';

export enum WalletTransactionSource {
    CONSULTATION_REFUND = 'consultation-refund',
    PRESCRIPTION_REFUND = 'prescription-refund',
    WALLET_RECHARGE = 'wallet-recharge',
    APPOINTMENT_PAYMENT = 'appointment-payment',
    WITHDRAWAL = 'withdrawal'
}

export interface IWalletTransaction extends Document {
    transactionID: string;
    walletID: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    source: WalletTransactionSource;
    amount: number;
    paymentID?: mongoose.Types.ObjectId; // Reference to the Payment document
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
    {
        transactionID: { type: String, required: true, unique: true },
        walletID: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        source: {
            type: String,
            enum: Object.values(WalletTransactionSource),
            required: true
        },
        amount: { type: Number, required: true },
        paymentID: { type: Schema.Types.ObjectId, ref: 'Payment' },
        message: { type: String }
    },
    { timestamps: true }
);

export const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
