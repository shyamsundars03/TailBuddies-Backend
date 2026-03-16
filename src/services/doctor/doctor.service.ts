import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { ISpecialtyRepository } from '../../repositories/interfaces/ISpecialtyRepository';
import { IDoctorService } from '../interfaces/IDoctorService';
import { IDoctor } from '../../models/doctor.model';
import { UpdateDoctorProfileDto, VerifyDoctorDto } from '../../dto/doctor.dto';
import { AppError } from '../../errors/app-error';
import { HttpStatus, ErrorMessages } from '../../constants';
import logger from '../../logger';

export class DoctorService implements IDoctorService {
    constructor(
        private readonly doctorRepository: IDoctorRepository,
        private readonly specialtyRepository: ISpecialtyRepository
    ) { }

    async getDoctorProfile(userId: string): Promise<IDoctor | null> {
        return await (this.doctorRepository as any).model.findOne({ userId })
            .populate({ path: 'userId', select: 'userName email gender phone profilePic', model: 'User' })
            .populate({ path: 'profile.specialtyId', model: 'Specialty' });
    }

    async getDoctorById(doctorId: string): Promise<IDoctor | null> {
        return await (this.doctorRepository as any).model.findById(doctorId)
            .populate({ path: 'userId', select: 'userName email gender phone profilePic', model: 'User' })
            .populate({ path: 'profile.specialtyId', model: 'Specialty' });
    }

    async updateDoctorProfile(userId: string, data: UpdateDoctorProfileDto): Promise<IDoctor> {
        let doctor = await this.doctorRepository.findByUserId(userId);

        if (!doctor) {
            // Create a basic doctor profile if it doesn't exist
            doctor = await this.doctorRepository.create({ userId } as any);
        }

        // Initialize verificationStatus if missing
        if (!doctor.verificationStatus) {
            doctor.verificationStatus = {
                clinic: false,
                education: false,
                experience: false,
                certificates: false,
                businessHours: false
            };
        }

        // Sync with User model if identity fields are provided
        const userData = data as any;
        if (userData.userName || userData.gender || userData.phone) {
            const updateFields: any = {};
            if (userData.userName) updateFields.userName = userData.userName;
            if (userData.gender) updateFields.gender = userData.gender;
            if (userData.phone) updateFields.phone = userData.phone;
            
            await (this.doctorRepository as any).model.db.model('User').findByIdAndUpdate(doctor.userId, updateFields);
            console.log(`[DoctorService] Synchronized user fields for ${userId}:`, updateFields);
        }

        // Update fields if provided and reset verification flags
        if (data.profile) {
            doctor.profile = { ...doctor.profile, ...data.profile } as any;
            // Optional: profile basic details don't have a specific verification flag yet
            // but we could reset overall verification if needed.
        }

        if (data.clinicInfo) {
            const { address, location, ...rest } = data.clinicInfo;
            
            if (!doctor.clinicInfo) {
                doctor.clinicInfo = {
                    clinicName: '',
                    clinicPic: '',
                    address: { doorNo: '', street: '', city: '', state: '', pincode: '' },
                    location: { type: 'Point', coordinates: [0, 0] }
                };
            }

            if (rest.clinicName !== undefined) doctor.clinicInfo.clinicName = rest.clinicName;
            if (rest.clinicPic !== undefined) doctor.clinicInfo.clinicPic = rest.clinicPic;
            
            if (address) {
                if (!doctor.clinicInfo.address) {
                    doctor.clinicInfo.address = { doorNo: '', street: '', city: '', state: '', pincode: '' };
                }
                const currentAddress = doctor.clinicInfo.address;
                if (address.doorNo !== undefined) currentAddress.doorNo = address.doorNo;
                if (address.street !== undefined) currentAddress.street = address.street;
                if (address.city !== undefined) currentAddress.city = address.city;
                if (address.state !== undefined) currentAddress.state = address.state;
                if (address.pincode !== undefined) currentAddress.pincode = address.pincode;
            }

            if (location) {
                doctor.clinicInfo.location = {
                    type: 'Point',
                    coordinates: [
                        Number(location.coordinates?.[0] || 0),
                        Number(location.coordinates?.[1] || 0)
                    ]
                };
            }
            doctor.verificationStatus.clinic = false;
        }
        
        if (data.experience) {
            doctor.experience = data.experience;
            doctor.verificationStatus.experience = false;
        }

        if (data.education) {
            doctor.education = data.education;
            doctor.verificationStatus.education = false;
        }

        if (data.certificates) {
            doctor.certificates = data.certificates.map(cert => ({
                ...cert,
                isVerified: false
            })) as any;
            doctor.verificationStatus.certificates = false;
        }

        if (data.businessHours) {
            console.log(`[DoctorService] Updating business hours for ${userId}:`, JSON.stringify(data.businessHours));
            doctor.businessHours = data.businessHours as any;
            doctor.verificationStatus.businessHours = false;
            doctor.markModified('businessHours');
        }

        if (data.profile?.specialtyId) {
            doctor.profile.specialtyId = data.profile.specialtyId as any;
        }

        // Always mark verificationStatus as modified since it's a nested object
        doctor.markModified('verificationStatus');
        doctor.markModified('profile');

        // If doctor makes an edit, check if we need to reset status
        // STRICT LOGIC: once verified, status NEVER changes back to incomplete.
        // If incomplete, and they update, it stays incomplete until they request verification.
        // If under_review or rejected, and they update, it stays in that status (admin just sees new data).
        if (doctor.profileStatus === 'incomplete') {
            // Keep as incomplete or move to under_review if needed?
            // Usually, user has to click "Get Verified" to trigger under_review.
        } else if (doctor.profileStatus === 'verified') {
            console.log(`[DoctorService] Doctor ${userId} is already verified. Edits will NOT reset status.`);
        } else {
            console.log(`[DoctorService] Doctor ${userId} status is ${doctor.profileStatus}. Maintaining status during edit.`);
        }
        
        const updatedDoctor = await doctor.save();
        logger.info('Doctor profile updated successfully', { userId, fields: Object.keys(data) });
        return updatedDoctor;
    }

    async verifyDoctor(doctorId: string, data: VerifyDoctorDto): Promise<IDoctor> {
        const doctor = await this.doctorRepository.findById(doctorId);
        if (!doctor) {
            throw new AppError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

        if (data.verificationStatus) {
            doctor.verificationStatus = { ...doctor.verificationStatus, ...data.verificationStatus };
        }

        if (data.isVerified !== undefined) {
            doctor.isVerified = data.isVerified;
            doctor.profileStatus = data.isVerified ? 'verified' : 'rejected';
            
            if (!data.isVerified && data.rejectionReason) {
                doctor.rejectionReason = data.rejectionReason;
            } else if (data.isVerified) {
                doctor.rejectionReason = null;
                // On global approval, set all section flags to true for consistency
                doctor.verificationStatus = {
                    clinic: true,
                    education: true,
                    experience: true,
                    certificates: true,
                    businessHours: doctor.verificationStatus.businessHours // Keep business hours as is or true? User excluded it from check, but for consistency lets set true if they exist.
                };
            }
        } else if (data.verificationStatus) {
            // Check if all necessary sections are now verified
            const sections = ['clinic', 'education', 'experience', 'certificates'];
            const allVerified = sections.every(s => (doctor.verificationStatus as any)[s] === true);
            
            if (allVerified) {
                doctor.isVerified = true;
                doctor.profileStatus = 'verified';
                doctor.rejectionReason = null;
                console.log(`[DoctorService] All sections verified for ${doctorId}. Automatically marking as verified.`);
            }
        }

        const updatedDoctor = await doctor.save();
        logger.info('Doctor verification status updated', { doctorId, status: data.isVerified });
        return updatedDoctor;
    }
    async requestVerification(userId: string): Promise<IDoctor> {
        const doctor = await this.getDoctorProfile(userId);
        if (!doctor) {
            throw new AppError('Profile not found. Please complete and save your basic details first.', HttpStatus.NOT_FOUND);
        }

        // Validation logic
        const errors: string[] = [];
        
        // Basic Profile Check
        // if (!doctor.profile.designation) errors.push('Designation is required');
        
        // Clinic Info Check
        if (!doctor.clinicInfo.clinicName) errors.push('Clinic name is required');
        if (!doctor.clinicInfo.clinicPic) errors.push('Clinic picture is required');
        if (!doctor.clinicInfo.address.city) errors.push('Clinic location details are required');

        // Education & Certificates Check
        if (doctor.education.length === 0) errors.push('At least one education record is required');
        if (doctor.education.some(edu => !edu.educationFile)) errors.push('Education certificates are required (PDF)');

        if (doctor.certificates.length === 0) errors.push('At least one certificate is required');
        if (doctor.certificates.some(cert => !cert.certificateFile)) errors.push('Certificate files are required (PDF)');

        // Business Hours Check - EXCLUDED per user request

        if (errors.length > 0) {
            throw new AppError(`Incomplete Profile: ${errors.join(', ')}`, HttpStatus.BAD_REQUEST);
        }

        doctor.profileStatus = 'under_review';
        doctor.isVerified = false;
        
        return await doctor.save();
    }

    async getAllDoctors(page: number, limit: number, search?: string, isVerified?: boolean, status?: string): Promise<{ doctors: IDoctor[], total: number }> {
        const filter: any = {};
        if (isVerified !== undefined) {
            filter.isVerified = isVerified;
        }

        if (status && status !== 'all') {
            filter.profileStatus = status;
        } else {
            // Admin list should ONLY show doctors who have submitted for review or are already handled.
            // This ensures NEW (incomplete) doctors are completely hidden.
            filter.profileStatus = { $in: ['under_review', 'verified', 'rejected'] };
        }
        
        console.log(`[DoctorService] getAllDoctors filter:`, JSON.stringify(filter));
        
        // Search by name would require population of user info
        if (search) {
            filter.$or = [
                { 'profile.designation': { $regex: search, $options: 'i' } },
                { 'clinicInfo.clinicName': { $regex: search, $options: 'i' } }
            ];
        }
        
        const options = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: { createdAt: -1 }
        };

        const doctors = await (this.doctorRepository as any).model.find(filter, null, options)
            .populate({ path: 'userId', select: 'userName email profilePic gender phone', model: 'User' })
            .populate({ path: 'profile.specialtyId', model: 'Specialty' });
        const total = await (this.doctorRepository as any).model.countDocuments(filter);

        return { doctors, total };
    }

    async getSpecialties(): Promise<any[]> {
        return await this.specialtyRepository.findAll({ status: 'active' });
    }
}
