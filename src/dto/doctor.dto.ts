export interface UpdateDoctorProfileDto {
    profile?: {
        specialtyId?: string;
        designation?: string;
        about?: string;
        consultationFees?: number;
        keywords?: string[];
        experienceYears?: number;
    };
    clinicInfo?: {
        clinicName?: string;
        clinicPic?: string;
        address?: {
            doorNo?: string;
            street?: string;
            city?: string;
            state?: string;
            pincode?: string;
        };
        location?: {
            type: string;
            coordinates: number[];
        };
    };
    experience?: {
        role: string;
        organization: string;
        startDate: Date;
        endDate?: Date;
        isCurrent: boolean;
        experienceFile?: string;
    }[];
    education?: {
        degree: string;
        institute: string;
        startDate: Date;
        endDate: Date;
        educationFile?: string;
    }[];
    certificates?: {
        certificateName: string;
        issuedBy: string;
        certificateFile: string;
        issuedYear: string;
    }[];
    businessHours?: {
        day: string;
        isWorking: boolean;
        slots: string[];
    }[];
}

export interface VerifyDoctorDto {
    isVerified: boolean;
    rejectionReason?: string;
    verificationStatus?: {
        clinic?: boolean;
        education?: boolean;
        experience?: boolean;
        certificates?: boolean;
        businessHours?: boolean;
    };
}
