import { z } from 'zod';

const AddressSchema = z.object({
    doorNo: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
});

const LocationSchema = z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2),
});

const EducationSchema = z.object({
    degree: z.string(),
    institute: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    educationFile: z.string().optional(),
});

const ExperienceSchema = z.object({
    role: z.string(),
    organization: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    isCurrent: z.boolean(),
    experienceFile: z.string().optional(),
});

const CertificateSchema = z.object({
    certificateName: z.string(),
    issuedBy: z.string(),
    issuedYear: z.string(),
    certificateFile: z.string().default(''),
    isVerified: z.boolean().optional(),
});

const TimeRangeSchema = z.object({
    start: z.string(),
    end: z.string(),
});

const DayScheduleSchema = z.object({
    day: z.string(),
    isWorking: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    duration: z.string(),
    slots: z.array(z.string()),
    breaks: z.array(TimeRangeSchema).optional(),
});

const optionalProfileNumber = z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : val;
}, z.number().optional());

const specialtyIdField = z.preprocess((val) => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'object' && val !== null && '_id' in val) {
        return String((val as { _id: string })._id);
    }
    return String(val);
}, z.string().optional());

export const UpdateDoctorProfileSchema = z.object({
    username: z.string().optional(),
    gender: z.string().optional(),
    phone: z.string().optional(),
    profile: z.object({
        designation: z.string().optional(),
        about: z.string().optional(),
        biography: z.string().optional(),
        specialtyId: specialtyIdField,
        keywords: z.array(z.string()).optional(),
        consultationFees: optionalProfileNumber,
        experienceYears: optionalProfileNumber,
    }).optional(),
    clinicInfo: z.object({
        clinicName: z.string().optional(),
        clinicPic: z.string().optional(),
        address: AddressSchema.optional(),
        location: LocationSchema.optional(),
    }).optional(),
    education: z.array(EducationSchema).optional(),
    experience: z.array(ExperienceSchema).optional(),
    certificates: z.array(CertificateSchema).optional(),
    businessHours: z.array(DayScheduleSchema).optional(),
    recurringSchedules: z.array(z.any()).optional(),
    appointmentDuration: z.number().optional(),
    isActive: z.boolean().optional(),
});

export const VerifyDoctorSchema = z.object({
    isVerified: z.boolean().optional(),
    rejectionReason: z.string().optional(),
    verificationStatus: z.record(z.string(), z.boolean()).optional(),
}).refine((data) => data.isVerified !== undefined || data.verificationStatus !== undefined, {
    message: 'Either isVerified or verificationStatus is required',
});

export type UpdateDoctorProfileInput = z.infer<typeof UpdateDoctorProfileSchema>;
export type VerifyDoctorInput = z.infer<typeof VerifyDoctorSchema>;
