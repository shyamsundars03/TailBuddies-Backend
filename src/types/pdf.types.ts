import { IPrescription } from '../models/prescription.model';
import { PopulatedDoctorRef, PopulatedPetRef } from './populated.types';

export type PrescriptionPdfInput = Pick<
    IPrescription,
    | 'prescriptionId'
    | 'createdAt'
    | 'symptoms'
    | 'vitals'
    | 'clinicalFindings'
    | 'diagnosis'
    | 'vetNotes'
    | 'recommendedTests'
    | 'medications'
    | 'followUpDate'
>;

export interface AppointmentPdfInput {
    doctorId?: PopulatedDoctorRef;
    petId?: PopulatedPetRef;
}

export type PrescriptionMedicationRow = IPrescription['medications'][number];
