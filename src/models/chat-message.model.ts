import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
    appointmentId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    senderRole: 'owner' | 'doctor';
    message: string;
    timestamp: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
    {
        appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderRole: { type: String, enum: ['owner', 'doctor'], required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

// Indexes for fast lookup
chatMessageSchema.index({ appointmentId: 1, timestamp: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
export default ChatMessage;
