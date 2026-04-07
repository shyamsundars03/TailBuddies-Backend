import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    holdAmount: number;
    isRequested?: boolean; // For doctor withdrawal requests
    createdAt: Date;
    updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        balance: { type: Number, default: 0 },
        holdAmount: { type: Number, default: 0 },
        isRequested: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);
export default Wallet;
