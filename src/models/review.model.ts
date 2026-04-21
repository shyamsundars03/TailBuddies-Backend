import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    appointmentId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    doctorId: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    isReplied: boolean;
    reply?: {
        comment: string;
        createdAt: Date;
        updatedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        appointmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true,
            unique: true
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 1000 // Approximate buffer for 100 words, will validate logic in service
        },
        isReplied: {
            type: Boolean,
            default: false
        },
        reply: {
            comment: { type: String },
            createdAt: { type: Date },
            updatedAt: { type: Date }
        }
    },
    { timestamps: true }
);

// Indexing for faster lookups
reviewSchema.index({ doctorId: 1 });
reviewSchema.index({ ownerId: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
export default Review;
