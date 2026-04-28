import { INotificationService } from '../services/notification.service';
import { AppointmentStatus } from '../enums/appointment-status.enum';

export class NotificationHelper {
    private static _notificationService: INotificationService;

    static init(notificationService: INotificationService) {
        this._notificationService = notificationService;
    }

    private static async create(userId: string, title: string, message: string, type: string, link: string) {
        if (!this._notificationService) {
            console.error('NotificationHelper not initialized');
            return;
        }
        return await this._notificationService.createNotification(userId, title, message, type, link);
    }

    // Appointment Notifications
    static async notifyAppointmentBooked(ownerId: string, doctorId: string, doctorUserId: string, petName: string, date: string, time: string, appointmentId: string) {
        const ownerTitle = 'Appointment Booked';
        const ownerMsg = `Great! Your appointment for ${petName} has been booked for ${time} on ${date}.`;
        const ownerLink = `/owner/bookings/${appointmentId}`;
        
        const doctorTitle = 'New Appointment Booking';
        const doctorMsg = `A new appointment for ${petName} has been booked for ${time} on ${date}.`;
        const doctorLink = `/doctor/appointments/${appointmentId}`;

        await Promise.all([
            this.create(ownerId, ownerTitle, ownerMsg, 'appointment', ownerLink),
            this.create(doctorUserId, doctorTitle, doctorMsg, 'appointment', doctorLink)
        ]);
    }

    static async notifyAppointmentConfirmed(ownerId: string, doctorUserId: string, petName: string, doctorName: string, date: string, time: string, appointmentId: string) {
        const ownerTitle = 'Appointment Confirmed';
        const ownerMsg = `Great! Your appointment for ${petName} with Dr. ${doctorName} has been confirmed for ${time} on ${date}.`;
        const ownerLink = `/owner/bookings/${appointmentId}`;

        const doctorTitle = 'Appointment Confirmed';
        const doctorMsg = `You have confirmed the appointment for ${petName} for ${time} on ${date}.`;
        const doctorLink = `/doctor/appointments/${appointmentId}`;

        await Promise.all([
            this.create(ownerId, ownerTitle, ownerMsg, 'appointment', ownerLink),
            this.create(doctorUserId, doctorTitle, doctorMsg, 'appointment', doctorLink)
        ]);
    }

    static async notifyAppointmentReminder(ownerId: string, doctorUserId: string, petName: string, time: string, appointmentId: string) {
        const title = 'Appointment Reminder';
        const msg = `Your appointment for ${petName} starts in 5 minutes at ${time}.`;
        
        await Promise.all([
            this.create(ownerId, title, msg, 'appointment', `/owner/bookings/${appointmentId}`),
            this.create(doctorUserId, title, msg, 'appointment', `/doctor/appointments/${appointmentId}`)
        ]);
    }

    static async notifyAppointmentCompleted(ownerId: string, doctorUserId: string, petName: string, doctorName: string, appointmentId: string) {
        const title = 'Appointment Completed';
        const msg = `Your consultation with Dr. ${doctorName} for ${petName} is now complete.`;
        const link = `/owner/bookings/${appointmentId}`;

        await Promise.all([
            this.create(ownerId, title, msg, 'appointment', link),
            this.create(doctorUserId, title, `The appointment for ${petName} has been marked as complete.`, 'appointment', `/doctor/appointments/${appointmentId}`)
        ]);
        
        // Follow up for prescription
        const rxTitle = 'Check Prescription';
        const rxMsg = `A prescription has been generated for ${petName}. Please check it in your dashboard.`;
        await this.create(ownerId, rxTitle, rxMsg, 'prescription', `/owner/medical-records`);
    }

    static async notifyAppointmentCancelled(ownerId: string, doctorUserId: string, petName: string, date: string, reason: string, appointmentId: string, cancelledByRole: string) {
        const title = 'Appointment Cancelled';
        const msg = `The appointment for ${petName} on ${date} has been cancelled. Reason: ${reason}`;
        
        if (cancelledByRole === 'doctor') {
            await this.create(ownerId, title, msg, 'appointment', `/owner/bookings/${appointmentId}`);
        } else {
            await this.create(doctorUserId, title, msg, 'appointment', `/doctor/appointments/${appointmentId}`);
        }
    }

    // Withdrawal Notifications
    static async notifyWithdrawalRequested(adminId: string, doctorUserId: string, doctorName: string, amount: number) {
        const adminTitle = 'New Withdrawal Request';
        const adminMsg = `Dr. ${doctorName} has requested a withdrawal of ₹${amount}.`;
        const adminLink = `/admin/transactions`;
        
        const doctorTitle = 'Withdrawal Request Submitted';
        const doctorMsg = `Your withdrawal request for ₹${amount} has been submitted for admin approval.`;
        const doctorLink = `/doctor/wallet`;

        await Promise.all([
            this.create(adminId, adminTitle, adminMsg, 'payment', adminLink),
            this.create(doctorUserId, doctorTitle, doctorMsg, 'payment', doctorLink)
        ]);
    }

    static async notifyWithdrawalApproved(doctorUserId: string, amount: number) {
        const title = 'Withdrawal Approved';
        const msg = `Your withdrawal request of ₹${amount} has been approved successfully.`;
        const link = `/doctor/wallet`;
        await this.create(doctorUserId, title, msg, 'payment', link);
    }

    static async notifyWithdrawalRejected(doctorUserId: string, amount: number, reason: string) {
        const title = 'Withdrawal Rejected';
        const msg = `Your withdrawal request of ₹${amount} was rejected. Reason: ${reason}`;
        const link = `/doctor/wallet`;
        await this.create(doctorUserId, title, msg, 'payment', link);
    }
}
