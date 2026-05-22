import { z } from 'zod';

export const VaccinationSchema = z.object({
    vaccinationName: z.string().min(2, "Vaccine name too short"),
    takenDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    certificate: z.string().default(''),
    isVerified: z.boolean().default(false),
});

export const PetSchema = z.object({
    name: z.string().min(2, "Pet name must be at least 2 characters"),
    species: z.string().min(2, "Species is required"),
    breed: z.string().min(2, "Breed is required"),
    gender: z.enum(['Male', 'Female', 'Unknown']),
    age: z.string().min(1, "Age is required"),
    dob: z.coerce.date(),
    weight: z.string().optional().default(''),
    picture: z.string().optional().default(''),
    isVaccinated: z.enum(['YES', 'NO']).optional().default('NO'),
    vaccinations: z.array(VaccinationSchema).optional().default([]),
});

export const ToggleActiveSchema = z.object({
    isActive: z.boolean(),
});

export type PetInput = z.infer<typeof PetSchema>;
export type VaccinationInput = z.infer<typeof VaccinationSchema>;
