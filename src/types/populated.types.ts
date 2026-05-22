import mongoose from 'mongoose';
import { IPrescription } from '../models/prescription.model';
import { IPet } from '../models/pet.model';
import { IDoctor } from '../models/doctor.model';
import { IUser } from '../models/user.models';
import { ISlot } from '../models/slot.model';
import { IWallet } from '../models/wallet.model';

export type PopulatedPetRef = Pick<IPet, 'name' | 'species' | 'breed' | 'gender' | 'age'> & {
    _id?: mongoose.Types.ObjectId;
};

export type PopulatedUserRef = Pick<IUser, 'username' | 'isBlocked'> & {
    _id?: mongoose.Types.ObjectId;
};

export type PopulatedDoctorRef = Pick<IDoctor, '_id'> & {
    userId?: PopulatedUserRef | mongoose.Types.ObjectId;
    profile?: {
        designation?: string;
        licenseNumber?: string;
    };
};

export type PopulatedSlotRef = Pick<ISlot, 'isBooked' | 'status'> & {
    _id?: mongoose.Types.ObjectId;
};

export type PopulatedWalletRef = IWallet & {
    userId?: PopulatedUserRef | mongoose.Types.ObjectId;
};

export function asPopulatedPet(value: unknown): PopulatedPetRef | null {
    if (typeof value !== 'object' || value === null || value instanceof mongoose.Types.ObjectId) {
        return null;
    }
    return value as PopulatedPetRef;
}

export function asPopulatedDoctor(value: unknown): PopulatedDoctorRef | null {
    if (typeof value !== 'object' || value === null || value instanceof mongoose.Types.ObjectId) {
        return null;
    }
    return value as PopulatedDoctorRef;
}

export function asPopulatedUser(value: unknown): PopulatedUserRef | null {
    if (typeof value !== 'object' || value === null || value instanceof mongoose.Types.ObjectId) {
        return null;
    }
    return value as PopulatedUserRef;
}

export function asPopulatedSlot(value: unknown): PopulatedSlotRef | null {
    if (typeof value !== 'object' || value === null || value instanceof mongoose.Types.ObjectId) {
        return null;
    }
    return value as PopulatedSlotRef;
}

export function asPopulatedWallet(value: unknown): PopulatedWalletRef | null {
    if (typeof value !== 'object' || value === null || value instanceof mongoose.Types.ObjectId) {
        return null;
    }
    return value as PopulatedWalletRef;
}

export function asPopulatedPrescription(value: unknown): IPrescription | null {
    if (typeof value !== 'object' || value === null || value instanceof mongoose.Types.ObjectId) {
        return null;
    }
    if ('prescriptionId' in value && typeof (value as IPrescription).prescriptionId === 'string') {
        return value as IPrescription;
    }
    return null;
}
