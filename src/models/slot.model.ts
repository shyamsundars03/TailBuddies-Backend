import mongoose, { Schema, Document } from 'mongoose';
import { ServiceType } from '../enums/service-type.enum';

export interface ISlot extends Document {
    vetId: mongoose.Types.ObjectId;
    date: Date;
    startTime: string; // e.g., "09:00"
    endTime: string;   // e.g., "09:30"
    isBooked: boolean;
    isBlocked: boolean;
    slotType: ServiceType;
    createdAt: Date;
    updatedAt: Date;
}

const slotSchema = new Schema<ISlot>(
    {
        vetId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        isBooked: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false },
        slotType: { 
            type: String, 
            enum: Object.values(ServiceType), 
            default: ServiceType.NORMAL 
        },
    },
    { timestamps: true }
);

// Index for efficient searching of available slots
slotSchema.index({ vetId: 1, date: 1, isBooked: 1, isBlocked: 1 });

export const Slot = mongoose.model<ISlot>('Slot', slotSchema);
export default Slot;
