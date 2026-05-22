export interface DoctorAppointmentStatsDto {
    booked: number;
    confirmed: number;
    ongoing: number;
    cancelled: number;
    completed: number;
    requests: number;
    upcoming: number;
}

export interface OwnerAppointmentStatsDto {
    booked: number;
    confirmed: number;
    ongoing: number;
    pending: number;
    cancelled: number;
    completed: number;
}
