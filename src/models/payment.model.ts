import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
    paymentID: string; // Razorpay transaction ID or similar
    ownerID: mongoose.Types.ObjectId;
    vetID?: mongoose.Types.ObjectId;
    appointmentID?: mongoose.Types.ObjectId;
    subscriptionID?: mongoose.Types.ObjectId;
    amount: number;
    purpose: 'consultation' | 'prescription' | 'subscription' | 'wallet-recharge';
    method: 'UPI' | 'card' | 'wallet' | 'cash' | 'razorpay';
    transactionID?: string;
    paymentStatus: 'success' | 'failed' | 'pending' | 'refunded';
    paymentDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        paymentID: { type: String, unique: true, required: true },
        ownerID: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        vetID: { type: Schema.Types.ObjectId, ref: 'Doctor' },
        appointmentID: { type: Schema.Types.ObjectId, ref: 'Appointment' },
        subscriptionID: { type: Schema.Types.ObjectId, ref: 'Subscription' },
        amount: { type: Number, required: true },
        purpose: {
            type: String,
            enum: ['consultation', 'prescription', 'subscription', 'wallet-recharge'],
            required: true
        },
        method: {
            type: String,
            enum: ['UPI', 'card', 'wallet', 'cash', 'razorpay'],
            required: true
        },
        transactionID: { type: String }, // Razorpay transaction ID
        paymentStatus: {
            type: String,
            enum: ['success', 'failed', 'pending', 'refunded'],
            default: 'pending'
        },
        paymentDate: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
