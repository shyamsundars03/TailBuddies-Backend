import mongoose, { Schema, Document } from 'mongoose';
import { AppointmentStatus } from '../enums/appointment-status.enum';
import { ServiceType } from '../enums/service-type.enum';

export interface IAppointment extends Document {
    ownerId: mongoose.Types.ObjectId;
    petId: mongoose.Types.ObjectId;
    doctorId: mongoose.Types.ObjectId;
    slotId: mongoose.Types.ObjectId;
    serviceType: ServiceType;
    problemDescription: string;
    symptoms: string[];
    appointmentDate: Date;
    appointmentStartTime: string;
    appointmentEndTime: string;
    mode: 'online' | 'offline';
    status: AppointmentStatus | 'booked' | 'confirmed' | 'cancelled' | 'completed';
    cancellation?: {
        cancelledBy: mongoose.Types.ObjectId;
        cancelReason: string;
        cancelledAt: Date;
    };
    checkIn?: {
        ownerCheckInTime?: Date;
        vetCheckInTime?: Date;
    };
    checkOut?: {
        ownerCheckOutTime?: Date;
        vetCheckOutTime?: Date;
    };
    appointmentId: string;
    delayStatus: 'none' | 'slight-delay' | 'major-delay';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    paymentMethod: 'cash' | 'razorpay' | 'wallet';
    transactionID?: string;
    totalAmount: number;
    prescriptionId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
        doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
        slotId: { type: Schema.Types.ObjectId, ref: 'Slot', required: true },
        serviceType: {
            type: String,
            enum: Object.values(ServiceType),
            required: true
        },
        problemDescription: { type: String, required: true },
        symptoms: { type: [String], default: [] },
        appointmentDate: { type: Date, required: true },
        appointmentStartTime: { type: String, required: true },
        appointmentEndTime: { type: String, required: true },
        mode: { type: String, enum: ['online', 'offline'], default: 'offline' },
        status: {
            type: String,
            enum: Object.values(AppointmentStatus),
            default: AppointmentStatus.BOOKED
        },
        cancellation: {
            cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
            cancelReason: { type: String },
            cancelledAt: { type: Date }
        },
        checkIn: {
            ownerCheckInTime: { type: Date },
            vetCheckInTime: { type: Date }
        },
        checkOut: {
            ownerCheckOutTime: { type: Date },
            vetCheckOutTime: { type: Date }
        },
        appointmentId: { type: String, unique: true },
        delayStatus: {
            type: String,
            enum: ['none', 'slight-delay', 'major-delay'],
            default: 'none'
        },
        paymentStatus: {
            type: String,
            enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
            default: 'PENDING'
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'razorpay', 'wallet', 'cod'],
            default: 'cash'
        },
        transactionID: { type: String },
        totalAmount: { type: Number, default: 0 },
        prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' }
    },
    { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
export default Appointment;
