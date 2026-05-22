import mongoose from 'mongoose';

export interface DoctorPatientListItem {
    id: mongoose.Types.ObjectId;
    name: string;
    species: string;
    breed: string;
    gender: string;
    dob: Date;
    ownerName: string;
    ownerEmail: string;
    lastAppointmentDate: Date;
    picture: string;
}

export interface DoctorPatientAggregateRow {
    _id: { petId: mongoose.Types.ObjectId };
    pet: {
        name: string;
        species: string;
        breed: string;
        gender: string;
        dob: Date;
        picture: string;
    };
    owner: {
        username: string;
        email: string;
    };
    lastAppointmentDate: Date;
}

export type DoctorCalendarSlot = mongoose.FlattenMaps<Record<string, unknown>> & {
    mode?: string;
    appointmentId?: mongoose.Types.ObjectId;
    status: string;
};
