import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { ISpecialtyRepository } from '../../repositories/interfaces/ISpecialtyRepository';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { ISlotRepository } from '../../repositories/interfaces/ISlotRepository';
import { IDoctorService } from '../interfaces/IDoctorService';
import { IDoctor } from '../../models/doctor.model';
import { UpdateDoctorProfileInput, VerifyDoctorInput } from '../../dto/doctor/doctor.schema';
import { AppError, NotFoundError, ValidationError } from '../../errors/app-error';
import { HttpStatus, ErrorMessages } from '../../constants';
import logger from '../../logger';
import mongoose from 'mongoose';
import { ISpecialty } from '../../models/specialty.model';

export class DoctorService implements IDoctorService {
    private readonly _doctorRepository: IDoctorRepository;
    private readonly _specialtyRepository: ISpecialtyRepository;
    private readonly _userRepository: IUserRepository;
    private readonly _slotRepository: ISlotRepository;

    constructor(
        doctorRepository: IDoctorRepository,
        specialtyRepository: ISpecialtyRepository,
        userRepository: IUserRepository,
        slotRepository: ISlotRepository
    ) {
        this._doctorRepository = doctorRepository;
        this._specialtyRepository = specialtyRepository;
        this._userRepository = userRepository;
        this._slotRepository = slotRepository;
    }




    async getDoctorProfile(userId: string): Promise<IDoctor | null> {
        let doctor = await this._doctorRepository.findByUserIdWithDetails(userId);

        if (!doctor) {
            logger.info('Lazy creating doctor profile for user', { userId });
            await this._doctorRepository.create({ userId: new mongoose.Types.ObjectId(userId) } as unknown as Partial<IDoctor>);
            doctor = await this._doctorRepository.findByUserIdWithDetails(userId);
        }

        return doctor;
    }

    async getDoctorById(doctorId: string): Promise<IDoctor | null> {
        return await this._doctorRepository.findByIdWithDetails(doctorId);
    }









    async updateDoctorProfile(userId: string, data: UpdateDoctorProfileInput): Promise<IDoctor> {
        let doctor = await this._doctorRepository.findByUserId(userId);

        if (!doctor) {
            doctor = await this._doctorRepository.create({ userId: new mongoose.Types.ObjectId(userId) } as unknown as Partial<IDoctor>);
        }

        if (!doctor.verificationStatus) {
            doctor.verificationStatus = {
                clinic: false,
                education: false,
                experience: false,
                certificates: false,
                businessHours: false
            };
        }

        const userData = data as Record<string, unknown>;
        if (userData.username || userData.gender || userData.phone) {
            const updateFields: Record<string, unknown> = {};
            if (userData.username) updateFields.username = userData.username;
            if (userData.gender) updateFields.gender = userData.gender;
            if (userData.phone) updateFields.phone = userData.phone;

            await this._userRepository.update(doctor.userId.toString(), updateFields);
        }

        if (data.profile) {
            const profileUpdate = { ...data.profile } as Record<string, unknown>;
            if (profileUpdate.biography && !profileUpdate.about) {
                profileUpdate.about = profileUpdate.biography;
            }
            delete profileUpdate.biography;
            doctor.profile = { ...doctor.profile, ...profileUpdate } as IDoctor['profile'];
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
            })) as IDoctor['certificates'];
            doctor.verificationStatus.certificates = false;
        }

        if (data.businessHours) {
            doctor.businessHours = data.businessHours as IDoctor['businessHours'];
            doctor.verificationStatus.businessHours = false;
            doctor.markModified('businessHours');
        }

        if (data.recurringSchedules) {
            doctor.recurringSchedules = data.recurringSchedules as IDoctor['recurringSchedules'];
            doctor.markModified('recurringSchedules');
        }

        if (data.profile?.specialtyId) {
            doctor.profile.specialtyId = new mongoose.Types.ObjectId(data.profile.specialtyId);
        }

        if (data.appointmentDuration) {
            doctor.appointmentDuration = data.appointmentDuration;
        }

        if (data.isActive !== undefined) {
            doctor.isActive = data.isActive;
        }

        doctor.markModified('verificationStatus');
        doctor.markModified('profile');
        if (data.clinicInfo) doctor.markModified('clinicInfo');
        if (data.experience) doctor.markModified('experience');
        if (data.education) doctor.markModified('education');
        if (data.certificates) doctor.markModified('certificates');

        const updatedDoctor = await doctor.save();

        if (!updatedDoctor) {
            throw new AppError('Failed to update doctor profile', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await this._slotRepository.deleteMany({
                vetId: doctor._id,
                date: { $gte: today },
                isBooked: false
            });
            logger.info(`[DoctorService] Cleared future available slots for doctor ${doctor._id} due to profile update`);
        } catch (error) {
            logger.error(`[DoctorService] Error clearing future slots:`, error);
        }

        logger.info('Doctor profile updated successfully', { userId, fields: Object.keys(data) });

        return updatedDoctor;
    }












    async verifyDoctor(doctorId: string, data: VerifyDoctorInput): Promise<IDoctor> {
        const doctor = await this._doctorRepository.findById(doctorId);

        if (!doctor) {
            throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
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

                doctor.verificationStatus = {
                    clinic: true,
                    education: true,
                    experience: true,
                    certificates: true,
                    businessHours: doctor.verificationStatus.businessHours
                };
            }
        } else if (data.verificationStatus) {
            const sections = ['clinic', 'education', 'experience', 'certificates'] as const;
            const allVerified = sections.every(s => doctor.verificationStatus[s] === true);

            if (allVerified) {
                doctor.isVerified = true;
                doctor.profileStatus = 'verified';
                doctor.rejectionReason = null;
            }
        }

        const updatedDoctor = await this._doctorRepository.update(doctorId, doctor.toObject());
        if (!updatedDoctor) {
            throw new AppError('Failed to update doctor verification status', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        logger.info('Doctor verification status updated', { doctorId, status: data.isVerified });
        return updatedDoctor;
    }

// async verifyDoctor(
//     doctorId: string,
//     data: VerifyDoctorInput
// ): Promise<IDoctor> {

//     const doctor = await this._doctorRepository.findById(doctorId);

//     if (!doctor) {
//         throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
//     }

//     const updateData: Partial<IDoctor> = {};

//     if (data.verificationStatus) {
//         updateData.verificationStatus = {
//             ...doctor.verificationStatus,
//             ...data.verificationStatus
//         };
//     }

//     if (data.isVerified !== undefined) {

//         updateData.isVerified = data.isVerified;

//         updateData.profileStatus =
//             data.isVerified ? 'verified' : 'rejected';

//         if (!data.isVerified && data.rejectionReason) {
//             updateData.rejectionReason = data.rejectionReason;
//         }

//         if (data.isVerified) {

//             updateData.rejectionReason = null;

//             updateData.verificationStatus = {
//                 clinic: true,
//                 education: true,
//                 experience: true,
//                 certificates: true,
//                 businessHours:
//                     doctor.verificationStatus?.businessHours || false
//             };
//         }
//     }

//     const updatedDoctor =
//         await this._doctorRepository.update(
//             doctorId,
//             updateData
//         );

//     if (!updatedDoctor) {
//         throw new AppError(
//             'Failed to update doctor verification status',
//             HttpStatus.INTERNAL_SERVER_ERROR
//         );
//     }

//     return updatedDoctor;
// }



    async requestVerification(userId: string): Promise<IDoctor> {
        const doctor = await this.getDoctorProfile(userId);
        if (!doctor) {
            throw new NotFoundError('Profile not found. Please complete and save your basic details first.');
        }


        const errors: string[] = [];

        if (!doctor.profile?.designation) errors.push('Designation is required');
        if (!doctor.profile?.specialtyId) errors.push('Specialty is required');
        if (!doctor.profile?.about || doctor.profile.about.trim().length < 10) {
            errors.push('Professional about section is required (min 10 characters)');
        }
        if (!doctor.profile?.consultationFees || doctor.profile.consultationFees <= 0) {
            errors.push('Consultation fee is required');
        }
        if (doctor.profile?.experienceYears === undefined || doctor.profile.experienceYears === null) {
            errors.push('Years of experience is required');
        }
        if (!doctor.profile?.keywords?.length) errors.push('At least one focus area is required');

        if (!doctor.clinicInfo.clinicName) errors.push('Clinic name is required');
        if (!doctor.clinicInfo.clinicPic) errors.push('Clinic picture is required');
        if (!doctor.clinicInfo.address.city) errors.push('Clinic location details are required');

        if (doctor.experience.length === 0) errors.push('At least one experience record is required');
        if (doctor.education.length === 0) errors.push('At least one education record is required');
        if (doctor.education.some(edu => !edu.educationFile)) errors.push('Education certificates are required (PDF)');

        if (doctor.certificates.length === 0) errors.push('At least one certificate is required');
        if (doctor.certificates.some(cert => !cert.certificateFile)) errors.push('Certificate files are required (PDF)');



        if (errors.length > 0) {
            throw new ValidationError(`Incomplete Profile: ${errors.join(', ')}`);
        }

        doctor.profileStatus = 'under_review';
        doctor.isVerified = false;

        const updatedDoctor = await this._doctorRepository.update(doctor._id.toString(), {
            profileStatus: 'under_review',
            isVerified: false
        });

        if (!updatedDoctor) {
            throw new AppError('Failed to submit verification request', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return updatedDoctor;
    }









    async getAllDoctors(page: number, limit: number, search?: string, isVerified?: boolean, status?: string, filters?: Record<string, unknown>, sortBy?: string): Promise<{ doctors: IDoctor[], total: number }> {
        const andFilters: Record<string, unknown>[] = [];

        if (isVerified !== undefined) {
            andFilters.push({ isVerified });
        }

        if (isVerified === true) {
            andFilters.push({ isActive: true });
        }

        if (status && status !== 'all') {
            andFilters.push({ profileStatus: status });
        } else if (!isVerified) {
            andFilters.push({ profileStatus: { $in: ['under_review', 'verified', 'rejected'] } });
        }

        if (filters) {
            if (filters.specialty) {
                andFilters.push({ 'profile.specialtyId': filters.specialty });
            }

            if (filters.experienceYears) {
                andFilters.push({ 'profile.experienceYears': { $gte: Number(filters.experienceYears) } });
            }

            if (filters.city) {
                andFilters.push({ 'clinicInfo.address.city': { $regex: filters.city, $options: 'i' } });
            }

            if (filters.minRating) {
                const rating = Number(filters.minRating);
                if (!isNaN(rating)) {
                    andFilters.push({ reviewCount: { $gt: 0 } });
                    andFilters.push({ averageRating: { $lte: rating } });
                }
            }
        }

        if (search) {
            const users = await this._userRepository.findAll({
                username: { $regex: search, $options: 'i' }
            });

            const userIds = users.map(u => u._id);

            andFilters.push({
                $or: [
                    { userId: { $in: userIds } },
                    { 'profile.designation': { $regex: search, $options: 'i' } },
                    { 'clinicInfo.clinicName': { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (filters?.gender) {
            const genderUsers = await this._userRepository.findAll({
                gender: { $regex: `^${filters.gender}$`, $options: 'i' }
            });
            const genderUserIds = genderUsers.map(u => u._id);
            andFilters.push({ userId: { $in: genderUserIds } });
        }

        const filter: Record<string, unknown> = andFilters.length > 0 ? { $and: andFilters } : {};

        let sort: Record<string, number> = { averageRating: -1, createdAt: -1 };
        if (sortBy) {
            if (sortBy === 'Price (Low to High)') {
                sort = { 'profile.consultationFees': 1 };
            } else if (sortBy === 'Price (High to Low)') {
                sort = { 'profile.consultationFees': -1 };
            } else if (sortBy === 'Rating') {
                sort = { averageRating: -1 };
            }
        }

        const { items: doctors, total } = await this._doctorRepository.findWithPagination(filter, page, limit, sort);
        return { doctors, total };
    }

    async getSpecialties(): Promise<ISpecialty[]> {
        return await this._specialtyRepository.findAll({ status: 'active' });
    }
}
