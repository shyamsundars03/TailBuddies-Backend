import { IDoctorRepository } from '../../repositories/interfaces/IDoctorRepository';
import { ISpecialtyRepository } from '../../repositories/interfaces/ISpecialtyRepository';
import { IDoctorService } from '../interfaces/IDoctorService';
import { IDoctor } from '../../models/doctor.model';
import { UpdateDoctorProfileDto, VerifyDoctorDto } from '../../dto/doctor.dto';
import { AppError } from '../../errors/app-error';
import { HttpStatus, ErrorMessages } from '../../constants';
import logger from '../../logger';
import Slot from '../../models/slot.model';

export class DoctorService implements IDoctorService {



    private readonly _doctorRepository: IDoctorRepository;
    private readonly _specialtyRepository: ISpecialtyRepository;

    constructor(
        doctorRepository: IDoctorRepository,
        specialtyRepository: ISpecialtyRepository
    ) {
        this._doctorRepository = doctorRepository;
        this._specialtyRepository = specialtyRepository;
    }




    async getDoctorProfile(userId: string): Promise<IDoctor | null> {
        let doctor = await this._doctorRepository.findByUserIdWithDetails(userId);

        if (!doctor) {

            logger.info('Lazy creating doctor profile for user', { userId });
            await this._doctorRepository.create({ userId } as any);
            doctor = await this._doctorRepository.findByUserIdWithDetails(userId);
        }

        return doctor;
    }

    async getDoctorById(doctorId: string): Promise<IDoctor | null> {
        return await this._doctorRepository.findByIdWithDetails(doctorId);
    }









    async updateDoctorProfile(userId: string, data: UpdateDoctorProfileDto): Promise<IDoctor> {
        let doctor = await this._doctorRepository.findByUserId(userId);

        if (!doctor) {

            doctor = await this._doctorRepository.create({ userId } as any);
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


        const userData = data as any;
        if (userData.username || userData.gender || userData.phone) {
            const updateFields: any = {};
            if (userData.username) updateFields.username = userData.username;
            if (userData.gender) updateFields.gender = userData.gender;
            if (userData.phone) updateFields.phone = userData.phone;

            await (this._doctorRepository as any)._model.db.model('User').findByIdAndUpdate(doctor.userId, updateFields);
            // console.log(`[DoctorService] Synchronized user fields for ${userId}:`, updateFields);
        }


        if (data.profile) {
            doctor.profile = { ...doctor.profile, ...data.profile } as any;

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
            // console.log(`[DoctorService] Updating business hours for ${userId}:`, JSON.stringify(data.businessHours));
            doctor.businessHours = data.businessHours as any;
            doctor.verificationStatus.businessHours = false;
            doctor.markModified('businessHours');
            // console.log(`[DoctorService] Set businessHours on doctor object:`, JSON.stringify(doctor.businessHours));
        }

        if (data.recurringSchedules) {
            doctor.recurringSchedules = data.recurringSchedules as any;
            doctor.markModified('recurringSchedules');
        }

        if (data.profile?.specialtyId) {
            doctor.profile.specialtyId = data.profile.specialtyId as any;
        }

        if (data.appointmentDuration) {
            doctor.appointmentDuration = data.appointmentDuration;
        }

        if (data.isActive !== undefined) {
            doctor.isActive = data.isActive;
        }


        doctor.markModified('verificationStatus');
        doctor.markModified('profile');


        const updatedDoctor = await doctor.save();


        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await Slot.deleteMany({
                vetId: doctor._id,
                date: { $gte: today },
                isBooked: false
            });
            logger.info(`[DoctorService] Cleared future available slots for doctor ${doctor._id} due to profile update`);
            // console.log(`[DoctorService] Cleared future slots for doctor ${doctor._id} to force regeneration.`);
        } catch (error) {
            console.error(`[DoctorService] Error clearing future slots:`, error);
        }



        logger.info('Doctor profile updated successfully', { userId, fields: Object.keys(data) });


        return updatedDoctor;
    }












    async verifyDoctor(doctorId: string, data: VerifyDoctorDto): Promise<IDoctor> {


        const doctor = await this._doctorRepository.findById(doctorId);



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

                doctor.verificationStatus = {
                    clinic: true,
                    education: true,
                    experience: true,
                    certificates: true,
                    businessHours: doctor.verificationStatus.businessHours
                };
            }
        } else if (data.verificationStatus) {

            const sections = ['clinic', 'education', 'experience', 'certificates'];
            const allVerified = sections.every(s => (doctor.verificationStatus as any)[s] === true);

            if (allVerified) {
                doctor.isVerified = true;
                doctor.profileStatus = 'verified';
                doctor.rejectionReason = null;
                // console.log(`[DoctorService] All sections verified for ${doctorId}. Automatically marking as verified.`);
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


        const errors: string[] = [];


        // if (!doctor.profile.designation) errors.push('Designation is required');


        if (!doctor.clinicInfo.clinicName) errors.push('Clinic name is required');
        if (!doctor.clinicInfo.clinicPic) errors.push('Clinic picture is required');
        if (!doctor.clinicInfo.address.city) errors.push('Clinic location details are required');


        if (doctor.education.length === 0) errors.push('At least one education record is required');
        if (doctor.education.some(edu => !edu.educationFile)) errors.push('Education certificates are required (PDF)');

        if (doctor.certificates.length === 0) errors.push('At least one certificate is required');
        if (doctor.certificates.some(cert => !cert.certificateFile)) errors.push('Certificate files are required (PDF)');



        if (errors.length > 0) {
            throw new AppError(`Incomplete Profile: ${errors.join(', ')}`, HttpStatus.BAD_REQUEST);
        }

        doctor.profileStatus = 'under_review';
        doctor.isVerified = false;



        return await doctor.save();



    }









    async getAllDoctors(page: number, limit: number, search?: string, isVerified?: boolean, status?: string, filters?: any, sortBy?: string): Promise<{ doctors: IDoctor[], total: number }> {
        const filter: any = {};


        const andFilters: any[] = [];

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
                    // Match the exact star bucket (e.g., 3 means [3.0, 4.0))
                    andFilters.push({ averageRating: { $gte: rating, $lt: rating + 1 } });
                }
            }
        }

        if (search) {
            const matchingUsers = await (this._doctorRepository as any)._model.db.model('User').find({
                username: { $regex: search, $options: 'i' }
            }).select('_id');

            const userIds = matchingUsers.map((u: any) => u._id);

            andFilters.push({
                $or: [
                    { userId: { $in: userIds } },
                    { 'profile.designation': { $regex: search, $options: 'i' } },
                    { 'clinicInfo.clinicName': { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (filters?.gender) {
            const genderUsers = await (this._doctorRepository as any)._model.db.model('User').find({
                gender: { $regex: `^${filters.gender}$`, $options: 'i' }
            }).select('_id');
            const genderUserIds = genderUsers.map((u: any) => u._id);
            andFilters.push({ userId: { $in: genderUserIds } });
        }

        if (andFilters.length > 0) {
            filter.$and = andFilters;
        }

        // Sorting logic
        let sort: any = { averageRating: -1, createdAt: -1 };
        if (sortBy) {
            if (sortBy === 'Price (Low to High)') {
                sort = { 'profile.consultationFees': 1 };
            } else if (sortBy === 'Price (High to Low)') {
                sort = { 'profile.consultationFees': -1 };
            } else if (sortBy === 'Rating') {
                sort = { averageRating: -1 };
            }
        }

        const options = {
            skip: (page - 1) * limit,
            limit: limit,
            sort: sort
        };

        const doctors = await (this._doctorRepository as any)._model.find(filter, null, options)
            .populate({ path: 'userId', select: 'username email role profilePic gender phone', model: 'User' })
            .populate({ path: 'profile.specialtyId', model: 'Specialty' });
        const total = await (this._doctorRepository as any)._model.countDocuments(filter);

        return { doctors, total };
    }

    async getSpecialties(): Promise<any[]> {
        return await this._specialtyRepository.findAll({ status: 'active' });
    }
}
