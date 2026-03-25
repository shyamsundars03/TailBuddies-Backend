import mongoose, { Schema, Document } from 'mongoose';

export interface IVaccination {
    vaccinationName: string;
    takenDate: Date;
    dueDate: Date;
    certificate: string;
    isVerified: boolean;
}

export interface IPet extends Document {
    ownerId: mongoose.Types.ObjectId;
    name: string;
    species: string;
    breed: string;
    gender: string;
    age: string;
    dob: Date;
    weight: string;
    picture: string;
    isActive: boolean;
    isVaccinated: string;
    vaccinations: IVaccination[];
    createdAt: Date;
    updatedAt: Date;
}

const vaccinationSchema = new Schema<IVaccination>({
    vaccinationName: { type: String, required: true },
    takenDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    certificate: { type: String, default: '' },
    isVerified: { type: Boolean, default: false }
});

const petSchema = new Schema<IPet>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Owner ID is required'],
        },
        name: {
            type: String,
            required: [true, 'Pet name is required'],
            trim: true,
        },
        species: {
            type: String,
            required: [true, 'Species is required'],
            trim: true,
        },
        breed: {
            type: String,
            required: [true, 'Breed is required'],
            trim: true,
        },
        gender: {
            type: String,
            required: [true, 'Gender is required'],
            enum: ['Male', 'Female', 'Unknown'],
            default: 'Unknown',
        },
        age: {
            type: String,
            required: [true, 'Age is required'],
        },
        dob: {
            type: Date,
            required: [true, 'Date of birth is required'],
        },
        weight: {
            type: String,
            required: [true, 'Weight is required'],
        },
        picture: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isVaccinated: {
            type: String,
            enum: ['YES', 'NO'],
            default: 'NO',
        },
        vaccinations: [vaccinationSchema],
    },
    {
        timestamps: true,
    }
);

petSchema.pre('save', function (next) {
    if (this.vaccinations && this.vaccinations.length > 0) {
        this.isVaccinated = 'YES';
    } else {
        this.isVaccinated = 'NO';
    }
    next();
});

export const Pet = mongoose.model<IPet>('Pet', petSchema);
export default Pet;
