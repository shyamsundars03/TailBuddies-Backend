import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
    userId: mongoose.Types.ObjectId;
    profile: {
        specialtyId: mongoose.Types.ObjectId;
        designation: string;
        about: string;
        consultationFees: number;
        keywords: string[];
        experienceYears: number;
    };
    clinicInfo: {
        clinicName: string;
        clinicPic: string;
        address: {
            doorNo: string;
            street: string;
            city: string;
            state: string;
            pincode: string;
        };
        location?: {
            type: string;
            coordinates: number[];
        };
    };
    experience: {
        role: string;
        organization: string;
        startDate: Date;
        endDate?: Date;
        isCurrent: boolean;
        experienceFile?: string;
    }[];
    education: {
        degree: string;
        institute: string;
        startDate: Date;
        endDate: Date;
        educationFile?: string;
    }[];
    certificates: {
        certificateName: string;
        issuedBy: string;
        certificateFile: string;
        issuedYear: string;
        isVerified: boolean;
        rejectionReason?: string;
    }[];
    businessHours: {
        day: string;
        isWorking: boolean;
        startTime: string;
        endTime: string;
        duration: string;
        slots: string[];
    }[];
    verificationStatus: {
        clinic: boolean;
        education: boolean;
        experience: boolean;
        certificates: boolean;
        businessHours: boolean;
    };
    profileStatus: 'incomplete' | 'under_review' | 'verified' | 'rejected';
    rejectionReason?: string | null;
    isVerified: boolean;
    isActive: boolean;
    appointmentDuration: number;
    totalAppointments: number;
    averageRating: number;
    reviewCount: number;
    recurringSchedules?: {
        id: string;
        rrule: string;
        dtstart: Date;
        dtend?: Date;
        isWorking: boolean;
        startTime: string;
        endTime: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        profile: {
            specialtyId: { type: Schema.Types.ObjectId, ref: 'Specialty' },
            designation: { type: String, default: '' },
            about: { type: String, default: '' },
            consultationFees: { type: Number, default: 0 },
            keywords: { type: [String], default: [] },
            experienceYears: { type: Number, default: 0 },
        },
        clinicInfo: {
            clinicName: { type: String, default: '' },
            clinicPic: { type: String, default: '' },
            address: {
                doorNo: { type: String, default: '' },
                street: { type: String, default: '' },
                city: { type: String, default: '' },
                state: { type: String, default: '' },
                pincode: { type: String, default: '' },
            },
            location: {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: { type: [Number], index: '2dsphere' },
            },
        },
        experience: [
            {
                role: { type: String, required: true },
                organization: { type: String, required: true },
                startDate: { type: Date, required: true },
                endDate: { type: Date },
                isCurrent: { type: Boolean, default: false },
                experienceFile: { type: String },
            },
        ],
        education: [
            {
                degree: { type: String, required: true },
                institute: { type: String, required: true },
                startDate: { type: Date, required: true },
                endDate: { type: Date, required: true },
                educationFile: { type: String },
            },
        ],
        certificates: [
            {
                certificateName: { type: String, required: true },
                issuedBy: { type: String, required: true },
                certificateFile: { type: String, required: true },
                issuedYear: { type: String, required: true },
                isVerified: { type: Boolean, default: false },
                rejectionReason: { type: String },
            },
        ],
        businessHours: [
            {
                day: { type: String, required: true },
                isWorking: { type: Boolean, default: true },
                startTime: { type: String, default: '09:00' },
                endTime: { type: String, default: '17:00' },
                duration: { type: String, default: '30' },
                slots: [String],
            },
        ],
        verificationStatus: {
            clinic: { type: Boolean, default: false },
            education: { type: Boolean, default: false },
            experience: { type: Boolean, default: false },
            certificates: { type: Boolean, default: false },
            businessHours: { type: Boolean, default: false },
        },
        profileStatus: {
            type: String,
            enum: ['incomplete', 'under_review', 'verified', 'rejected'],
            default: 'incomplete',
        },
        rejectionReason: {
            type: String,
            default: null,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        appointmentDuration: {
            type: Number,
            default: 30, // Default to 30 minutes
        },
        totalAppointments: {
            type: Number,
            default: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
        },
        reviewCount: {
            type: Number,
            default: 0,
        },
        recurringSchedules: [
            {
                id: { type: String, required: true },
                rrule: { type: String, required: true },
                dtstart: { type: Date, required: true },
                dtend: { type: Date },
                isWorking: { type: Boolean, default: true },
                startTime: { type: String, required: true },
                endTime: { type: String, required: true },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
export default Doctor;
