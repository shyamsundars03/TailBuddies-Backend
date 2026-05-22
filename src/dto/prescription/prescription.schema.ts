import { z } from 'zod';

export const MedicationSchema = z.object({
    name: z.string().min(1, "Medication name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    duration: z.string().min(1, "Duration is required"),
    notes: z.string().optional(),
});

export const PrescriptionSchema = z.object({
    appointmentId: z.string(),
    petId: z.string(),
    ownerId: z.string(),
    diagnosis: z.string().min(1, 'Diagnosis is required'),
    clinicalFindings: z.string().min(1, 'Clinical findings are required'),
    medications: z.array(MedicationSchema).optional(),
    vetNotes: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    vitals: z.object({
        temperature: z.string().optional(),
        pulse: z.string().optional(),
        respiration: z.string().optional(),
    }).optional(),
    followUpDate: z.string().optional(),
});

export type PrescriptionInput = z.infer<typeof PrescriptionSchema>;
export type MedicationInput = z.infer<typeof MedicationSchema>;
