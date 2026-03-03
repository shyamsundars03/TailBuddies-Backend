import mongoose, { Schema, Document } from 'mongoose';

export interface ISpecialty extends Document {
    name: string;
    description: string;
    commonDesignation: string[];
    typicalKeywords: string[];
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

const specialtySchema = new Schema<ISpecialty>(
    {
        name: {
            type: String,
            required: [true, 'Specialty name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        commonDesignation: {
            type: [String],
            default: [],
        },
        typicalKeywords: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

export const Specialty = mongoose.model<ISpecialty>('Specialty', specialtySchema);
export default Specialty;
