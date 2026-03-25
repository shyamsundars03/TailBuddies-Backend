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
        return await this.doctorRepository.findByUserIdWithDetails(userId);
    }

    async getDoctorById(doctorId: string): Promise<IDoctor | null> {
        return await this.doctorRepository.findByIdWithDetails(doctorId);
    }









    async updateDoctorProfile(userId: string, data: UpdateDoctorProfileDto): Promise<IDoctor> {
        let doctor = await this.doctorRepository.findByUserId(userId);

        if (!doctor) {
            
            doctor = await this.doctorRepository.create({ userId } as any);
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
        if (userData.userName || userData.gender || userData.phone) {
            const updateFields: any = {};
            if (userData.userName) updateFields.userName = userData.userName;
            if (userData.gender) updateFields.gender = userData.gender;
            if (userData.phone) updateFields.phone = userData.phone;
            
            await (this.doctorRepository as any).model.db.model('User').findByIdAndUpdate(doctor.userId, updateFields);
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

        // Validation logic
        const errors: string[] = [];
        
        // Basic Profile Check
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









    async getAllDoctors(page: number, limit: number, search?: string, isVerified?: boolean, status?: string, filters?: any): Promise<{ doctors: IDoctor[], total: number }> {
        const filter: any = {};
        
        
        if (isVerified !== undefined) {
            filter.isVerified = isVerified;
        }
        
        



        if (isVerified === true) {
            filter.isActive = true;
        }

        if (status && status !== 'all') {
            filter.profileStatus = status;
        } else if (!isVerified) {
            
            filter.profileStatus = { $in: ['under_review', 'verified', 'rejected'] };
        }
        

        if (filters) {
            if (filters.specialty) {
                filter['profile.specialtyId'] = filters.specialty;
            }

            if (filters.experienceYears) {
                filter['profile.experienceYears'] = { $gte: Number(filters.experienceYears) };
            }
        }

   
        if (search) {
            
            const matchingUsers = await (this.doctorRepository as any).model.db.model('User').find({
                userName: { $regex: search, $options: 'i' }
            }).select('_id');


            const userIds = matchingUsers.map((u: any) => u._id);



            filter.$or = [
                { userId: { $in: userIds } },
                { 'profile.designation': { $regex: search, $options: 'i' } },
                { 'clinicInfo.clinicName': { $regex: search, $options: 'i' } }
            ];
            
           
        }




        if (filters?.gender) {
            const genderUsers = await (this.doctorRepository as any).model.db.model('User').find({
                gender: { $regex: `^${filters.gender}$`, $options: 'i' }
            }).select('_id');
            const genderUserIds = genderUsers.map((u: any) => u._id);
            
            filter.userId = { $in: genderUserIds };
            
            // If we have search-based $or for userId, we must intersect it
            if (filter.$or) {
                const searchOr = filter.$or;
                delete filter.$or;
                filter.$and = [
                    { $or: searchOr },
                    { userId: { $in: genderUserIds } }
                ];
            }
        }
        
        // console.log(`[DoctorService] getAllDoctors final filter:`, JSON.stringify(filter));
        
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
