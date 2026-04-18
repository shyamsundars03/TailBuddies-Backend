import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
    prescriptionId: string;
    appointmentId: mongoose.Types.ObjectId;
    vetId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    petId: mongoose.Types.ObjectId;
    symptoms: string[];
    vitals: {
        temperature?: string;
        pulse?: string;
        respiration?: string;
    };
    clinicalFindings: string;
    diagnosis: string;
    vetNotes?: string;
    recommendedTests: string[];
    medications: {
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        notes?: string;
    }[];
    followUpDate?: Date;
    prescriptionPDF?: string;
    createdAt: Date;
    updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
    {
        prescriptionId: { type: String, required: true, unique: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
        vetId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
        symptoms: { type: [String], default: [] },
        vitals: {
            temperature: { type: String },
            pulse: { type: String },
            respiration: { type: String }
        },
        clinicalFindings: { type: String, required: true },
        diagnosis: { type: String, required: true },
        vetNotes: { type: String },
        recommendedTests: { type: [String], default: [] },
        medications: [
            {
                name: { type: String, required: true },
                dosage: { type: String, required: true },
                frequency: { type: String, required: true },
                duration: { type: String, required: true },
                notes: { type: String }
            }
        ],
        followUpDate: { type: Date },
        prescriptionPDF: { type: String }
    },
    { timestamps: true }
);

export const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);
export default Prescription;
