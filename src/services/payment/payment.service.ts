import Razorpay from 'razorpay';
import crypto from 'crypto';
import { IPaymentRepository } from '../../repositories/interfaces/IPaymentRepository';
import { IPaymentService, PaymentVerificationData, RazorpayOrderResponse } from '../interfaces/IPaymentService';
import { IPayment } from '../../models/payment.model';
import { WalletTransactionSource } from '../../models/wallet-transaction.model';
import { extractId } from '../../utils/mongoose-id.util';
import { asPopulatedDoctor, asPopulatedPet, asPopulatedSlot, asPopulatedUser, asPopulatedWallet } from '../../types/populated.types';
import { env } from '../../config/env';
import logger from '../../logger';
import mongoose from 'mongoose';
import { Appointment } from '../../models/appointment.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { Slot } from '../../models/slot.model';
import { IWallet } from '../../models/wallet.model';
import { IWalletTransaction, WalletTransaction } from '../../models/wallet-transaction.model';
import { NotificationHelper } from '../../utils/notification-helper';
import Admin from '../../models/admin.model';
import { Doctor } from '../../models/doctor.model';
import { AppError, NotFoundError, ValidationError } from '../../errors/app-error';
import { getErrorMessage, toServiceError } from '../../utils/service-error.util';
import { HttpStatus } from '../../constants';
export class PaymentService implements IPaymentService {
    private razorpay: Razorpay;
    private _paymentRepository: IPaymentRepository;

    constructor(paymentRepository: IPaymentRepository) {
        this._paymentRepository = paymentRepository;
        this.razorpay = new Razorpay({
            key_id: env.razorpayKeyId,
            key_secret: env.razorpayKeySecret
        });
    }

    async createRazorpayOrder(amount: number, appointmentId: string, userId: string): Promise<{ order: RazorpayOrderResponse }> {
        if (appointmentId !== 'topup') {
            const appointment = await Appointment.findById(appointmentId).populate('slotId');
            if (!appointment) throw new NotFoundError('Appointment not found');

            const slot = asPopulatedSlot(appointment.slotId);
            if (!slot || (slot.isBooked && appointment.status !== AppointmentStatus.PAYMENT_PENDING)) {
                throw new ValidationError('This slot is no longer available');
            }
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `receipt_${appointmentId}`,
        };

        logger.info('PaymentService: Attempting to create Razorpay order', {
            amount_paise: options.amount,
            appointmentId,
            userId,
            keyId: env.razorpayKeyId
        });

        let order;
        try {
            order = await this.razorpay.orders.create(options);
            logger.info('PaymentService: Razorpay order created successfully', { orderId: order.id });
        } catch (rzpErr: unknown) {
            const message = getErrorMessage(rzpErr);
            const metadata =
                typeof rzpErr === 'object' && rzpErr !== null && 'error' in rzpErr
                    ? (rzpErr as { error?: unknown }).error
                    : rzpErr;
            logger.error('PaymentService: Razorpay API call failed', {
                error: message,
                metadata,
            });
            throw new AppError(`Razorpay API Error: ${message}`, HttpStatus.BAD_GATEWAY);
        }

        const paymentData: Partial<IPayment> = {
            paymentID: order.id,
            ownerID: new mongoose.Types.ObjectId(userId),
            amount: amount,
            purpose: appointmentId === 'topup' ? 'wallet-recharge' : 'consultation',
            method: 'razorpay',
            paymentStatus: 'pending',
            paymentDate: new Date()
        };

        if (appointmentId !== 'topup') {
            paymentData.appointmentID = new mongoose.Types.ObjectId(appointmentId);
        }

        await this._paymentRepository.createPayment(paymentData);

        return { order: order as RazorpayOrderResponse };
    }

    async verifyRazorpaySignature(verificationData: PaymentVerificationData): Promise<void> {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = verificationData;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", env.razorpayKeySecret)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const paymentRecord = await this._paymentRepository.updatePaymentStatus(razorpay_order_id, 'success', razorpay_payment_id, session);

                if (appointmentId === 'topup') {
                    if (paymentRecord) {
                        const userId = paymentRecord.ownerID.toString();
                        let wallet = await this._paymentRepository.getWalletByUserId(userId, session);
                        if (!wallet) {
                            wallet = await this._paymentRepository.createWallet({
                                userId: new mongoose.Types.ObjectId(userId),
                                balance: 0,
                                holdAmount: 0
                            }, session);
                        }

                        await this._paymentRepository.updateWalletBalance(userId, paymentRecord.amount, 'credit', session);

                        await this._paymentRepository.createWalletTransaction({
                            transactionID: `TXN_${Date.now()}_${razorpay_payment_id.slice(-4)}`,
                            walletID: wallet._id as mongoose.Types.ObjectId,
                            amount: paymentRecord.amount,
                            type: 'credit',
                            source: WalletTransactionSource.WALLET_RECHARGE,
                            message: 'Wallet Top-up via Razorpay',
                        }, session);

                        logger.info('Wallet top-up successful via Razorpay', { userId, amount: paymentRecord.amount });
                    }
                } else {
                    const appointment = await Appointment.findById(appointmentId)
                        .populate('petId')
                        .populate({ path: 'doctorId', populate: { path: 'userId' } })
                        .session(session);
                    if (!appointment) throw new NotFoundError('Appointment not found');

                    const slot = await Slot.findById(appointment.slotId).session(session);
                    if (!slot || slot.isBooked) {
                        throw new ValidationError('Slot is no longer available. Please contact support for refund if money was deducted.');
                    }

                    slot.isBooked = true;
                    slot.status = 'booked';
                    await slot.save({ session });

                    appointment.status = AppointmentStatus.BOOKED;
                    appointment.paymentStatus = 'PAID';
                    appointment.paymentMethod = 'razorpay';
                    appointment.transactionID = razorpay_payment_id;
                    await appointment.save({ session });

                    try {
                        const pet = asPopulatedPet(appointment.petId);
                        const doctor = asPopulatedDoctor(appointment.doctorId);
                        if (pet && doctor) {
                            await NotificationHelper.notifyAppointmentBooked(
                                appointment.ownerId.toString(),
                                extractId(doctor._id),
                                extractId(doctor.userId),
                                pet.name || 'a pet',
                                new Date(appointment.appointmentDate).toLocaleDateString(),
                                appointment.appointmentStartTime,
                                appointment._id.toString()
                            );
                        }
                    } catch (notiErr) {
                        logger.error('Error sending booking notification after Razorpay success:', notiErr);
                    }

                    logger.info('Appointment payment successful via Razorpay', { appointmentId, paymentId: razorpay_payment_id });
                }

                await session.commitTransaction();
            } catch (error: unknown) {
                await session.abortTransaction();
                logger.error('Error during payment verification transaction', { error: getErrorMessage(error) });
                throw toServiceError(error, 'Payment verification failed');
            } finally {
                session.endSession();
            }
        } else {
            await this._paymentRepository.updatePaymentStatus(razorpay_order_id, 'failed');
            logger.info('Payment verification failed, keeping appointment as payment pending for retry', { appointmentId });
            throw new ValidationError('Invalid payment signature');
        }
    }

    async getWallet(userId: string): Promise<IWallet> {
        let wallet = await this._paymentRepository.getWalletByUserId(userId);
        if (!wallet) {
            wallet = await this._paymentRepository.createWallet({ userId: new mongoose.Types.ObjectId(userId), balance: 0, holdAmount: 0 });
        }
        return wallet;
    }

    async processWalletPayment(userId: string, amount: number, appointmentId: string): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet || wallet.balance < amount) {
                throw new ValidationError('Insufficient wallet balance');
            }

            await this._paymentRepository.updateWalletBalance(userId, amount, 'debit', session);

            const internalPaymentId = `WAL_${Date.now()}_${appointmentId.toString().slice(-4)}`;
            const payment = await this._paymentRepository.createPayment({
                paymentID: internalPaymentId,
                ownerID: new mongoose.Types.ObjectId(userId),
                appointmentID: new mongoose.Types.ObjectId(appointmentId),
                amount: amount,
                purpose: 'consultation',
                method: 'wallet',
                paymentStatus: 'success',
                transactionID: internalPaymentId,
                paymentDate: new Date()
            }, session);

            const appointment = await Appointment.findById(appointmentId)
                .populate('petId')
                .populate({ path: 'doctorId', populate: { path: 'userId' } })
                .session(session);
            if (!appointment) throw new NotFoundError('Appointment not found');

            const slot = await Slot.findById(appointment.slotId).session(session);
            if (!slot || slot.isBooked) {
                throw new ValidationError('Slot is no longer available');
            }

            await this._paymentRepository.createWalletTransaction({
                transactionID: internalPaymentId,
                walletID: wallet._id as mongoose.Types.ObjectId,
                type: 'debit',
                source: WalletTransactionSource.APPOINTMENT_PAYMENT,
                amount: amount,
                paymentID: payment._id as mongoose.Types.ObjectId,
                appointmentID: appointment._id as mongoose.Types.ObjectId,
                humanReadableId: appointment.appointmentId,
                message: `Payment for appointment ${appointment.appointmentId}`
            }, session);

            slot.isBooked = true;
            slot.status = 'booked';
            await slot.save({ session });

            appointment.status = AppointmentStatus.BOOKED;
            appointment.paymentStatus = 'PAID';
            appointment.paymentMethod = 'wallet';
            appointment.transactionID = internalPaymentId;
            await appointment.save({ session });

            try {
                const pet = asPopulatedPet(appointment.petId);
                const doctor = asPopulatedDoctor(appointment.doctorId);
                if (pet && doctor) {
                    await NotificationHelper.notifyAppointmentBooked(
                        appointment.ownerId.toString(),
                        extractId(doctor._id),
                        extractId(doctor.userId),
                        pet.name || 'a pet',
                        new Date(appointment.appointmentDate).toLocaleDateString(),
                        appointment.appointmentStartTime,
                        appointment._id.toString()
                    );
                }
            } catch (notiErr) {
                logger.error('Error sending booking notification after Wallet payment success:', notiErr);
            }

            await session.commitTransaction();
        } catch (error: unknown) {
            await session.abortTransaction();
            logger.error('Error processing wallet payment', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Wallet payment failed');
        } finally {
            session.endSession();
        }
    }

    async topUpWallet(userId: string, amount: number, transactionId: string): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            let wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet) {
                wallet = await this._paymentRepository.createWallet({ userId: new mongoose.Types.ObjectId(userId), balance: 0 }, session);
            }

            await this._paymentRepository.updateWalletBalance(userId, amount, 'credit', session);

            const internalPaymentId = `TOP_${Date.now()}_${userId.slice(-4)}`;
            const payment = await this._paymentRepository.createPayment({
                paymentID: internalPaymentId,
                ownerID: new mongoose.Types.ObjectId(userId),
                amount: amount,
                purpose: 'wallet-recharge',
                method: 'razorpay',
                paymentStatus: 'success',
                transactionID: transactionId,
                paymentDate: new Date()
            }, session);

            await this._paymentRepository.createWalletTransaction({
                transactionID: transactionId,
                walletID: wallet._id as mongoose.Types.ObjectId,
                type: 'credit',
                source: WalletTransactionSource.WALLET_RECHARGE,
                amount: amount,
                paymentID: payment._id as mongoose.Types.ObjectId,
                message: 'Wallet top-up successful'
            }, session);

            await session.commitTransaction();
        } catch (error: unknown) {
            await session.abortTransaction();
            logger.error('Error topping up wallet', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Wallet top-up failed');
        } finally {
            session.endSession();
        }
    }

    async processCashPayment(appointmentId: string, userId: string): Promise<void> {
        const internalPaymentId = `CASH_${Date.now()}_${appointmentId.toString().slice(-4)}`;
        await this._paymentRepository.createPayment({
            paymentID: internalPaymentId,
            ownerID: new mongoose.Types.ObjectId(userId),
            appointmentID: new mongoose.Types.ObjectId(appointmentId),
            amount: 0,
            purpose: 'consultation',
            method: 'cash',
            paymentStatus: 'pending',
            paymentDate: new Date()
        });

        await Appointment.findByIdAndUpdate(appointmentId, { status: AppointmentStatus.BOOKED });
    }

    async getTransactions(userId: string, page: number, limit: number): Promise<{ transactions: IWalletTransaction[]; total: number }> {
        const wallet = await this._paymentRepository.getWalletByUserId(userId);
        if (!wallet) return { transactions: [], total: 0 };

        const { transactions, total } = await this._paymentRepository.getWalletTransactions(wallet._id.toString(), page, limit);
        return { transactions, total };
    }

    async retryPayment(appointmentId: string, method: string): Promise<{ order: RazorpayOrderResponse } | Record<string, unknown>> {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) throw new NotFoundError('Appointment not found');

        if (method === 'razorpay') {
            // This is a placeholder for actual retry logic if any order needs to be re-created
            throw new ValidationError('Retry logic for Razorpay triggered. Fetching details...');
        }

        throw new ValidationError('Invalid retry method');
    }

    async refund(appointmentId: string, reason: string, externalSession?: mongoose.ClientSession): Promise<void> {
        const session = externalSession || await mongoose.startSession();
        if (!externalSession) session.startTransaction();
        try {
            const appointment = await Appointment.findById(appointmentId).session(session);
            if (!appointment) throw new NotFoundError('Appointment not found');
            if (appointment.paymentStatus !== 'PAID') throw new ValidationError('Appointment is not paid');

            const userId = extractId(appointment.ownerId);
            const amount = appointment.totalAmount;

            await this._paymentRepository.updateWalletBalance(userId, amount, 'credit', session);

            const wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet) throw new NotFoundError('Wallet not found');

            await this._paymentRepository.createWalletTransaction({
                transactionID: `REF_${Date.now()}`,
                walletID: wallet._id,
                type: 'credit',
                source: WalletTransactionSource.APPOINTMENT_REFUND,
                amount: amount,
                appointmentID: appointment._id as mongoose.Types.ObjectId,
                humanReadableId: appointment.appointmentId,
                message: `Refund for appointment ${appointment.appointmentId}: ${reason}`
            }, session);

            await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: 'REFUNDED' }, { session });
            if (!externalSession) await session.commitTransaction();
        } catch (error: unknown) {
            if (!externalSession) await session.abortTransaction();
            logger.error('Error in refund method', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Refund failed');
        } finally {
            if (!externalSession) session.endSession();
        }
    }

    async getAllTransactions(page: number, limit: number, search?: string, status?: string): Promise<{ transactions: IWalletTransaction[]; total: number }> {
        const { transactions, total } = await this._paymentRepository.findAllWalletTransactions(page, limit, search, status);
        return { transactions, total };
    }

    async getTransactionDetail(id: string): Promise<IWalletTransaction> {
        const transaction = await this._paymentRepository.getTransactionById(id);
        if (!transaction) throw new NotFoundError('Transaction not found');
        return transaction;
    }

    async creditDoctorWallet(userId: string, amount: number, appointmentId: string, humanReadableId: string): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            let wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet) {
                wallet = await this._paymentRepository.createWallet({
                    userId: new mongoose.Types.ObjectId(userId),
                    balance: 0,
                    holdAmount: 0
                }, session);
            }

            const existingCredit = await WalletTransaction.findOne({
                walletID: wallet._id,
                appointmentID: new mongoose.Types.ObjectId(appointmentId),
                type: 'credit',
            }).session(session);

            if (existingCredit) {
                await session.commitTransaction();
                return;
            }

            await this._paymentRepository.updateWalletBalance(userId, amount, 'credit', session);

            const txnId = `DOC_CREDIT_${Date.now()}_${appointmentId.slice(-4)}`;
            await this._paymentRepository.createWalletTransaction({
                transactionID: txnId,
                walletID: wallet._id,
                type: 'credit',
                source: WalletTransactionSource.APPOINTMENT_PAYMENT,
                amount: amount,
                appointmentID: new mongoose.Types.ObjectId(appointmentId),
                humanReadableId: humanReadableId,
                message: `Consultation fee for ${humanReadableId}`
            }, session);

            await session.commitTransaction();
        } catch (error: unknown) {
            await session.abortTransaction();
            logger.error('Error crediting doctor wallet', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Failed to credit doctor wallet');
        } finally {
            session.endSession();
        }
    }

    async requestWithdrawal(userId: string, amount: number): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet || wallet.balance < amount) {
                throw new ValidationError('Insufficient wallet balance');
            }

            const commission = amount * 0.1;
            const netAmount = amount - commission;

            wallet.isRequested = true;
            await wallet.save({ session });

            const txnId = `REQ_${Date.now()}`;
            await this._paymentRepository.createWalletTransaction({
                transactionID: txnId,
                walletID: wallet._id,
                type: 'requested',
                status: 'PENDING',
                source: WalletTransactionSource.WITHDRAWAL,
                amount: amount,
                grossAmount: amount,
                commission: commission,
                netAmount: netAmount,
                message: `Withdrawal requested (Pending Admin Approval). Net Payout: ₹${netAmount} after 10% company share.`
            }, session);

            await session.commitTransaction();

            try {
                const admins = await Admin.find().select('_id');
                const doctor = await Doctor.findOne({ userId }).populate('userId');
                const doctorUser = asPopulatedUser(doctor?.userId);
                const doctorName = doctorUser?.username || 'Doctor';

                for (const admin of admins) {
                    await NotificationHelper.notifyWithdrawalRequested(admin._id.toString(), userId, doctorName, amount);
                }
            } catch (err) {
                logger.error('Error sending withdrawal request notification to admin', err);
            }
        } catch (error: unknown) {
            await session.abortTransaction();
            logger.error('Error in requestWithdrawal', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Withdrawal request failed');
        } finally {
            session.endSession();
        }
    }

    async approveWithdrawal(transactionId: string): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const transaction = await this._paymentRepository.getTransactionById(transactionId);
            if (!transaction) throw new NotFoundError('Transaction not found');

            if (transaction.status !== 'PENDING' || transaction.type !== 'requested') {
                throw new ValidationError('Transaction is not in a pending requested state');
            }

            const wallet = asPopulatedWallet(transaction.walletID);
            if (!wallet) throw new NotFoundError('Associated wallet not found');

            if (wallet.balance < transaction.amount) {
                throw new ValidationError('Insufficient wallet balance for this withdrawal');
            }

            wallet.balance -= transaction.amount;
            wallet.isRequested = false;
            await wallet.save({ session });

            transaction.status = 'COMPLETED';
            transaction.type = 'debit';
            transaction.message = 'Withdrawal approved by Admin';
            await transaction.save({ session });

            await session.commitTransaction();

            try {
                const doctorUserId = wallet.userId?._id?.toString() || wallet.userId?.toString();
                await NotificationHelper.notifyWithdrawalApproved(doctorUserId, transaction.amount);
            } catch (err) {
                logger.error('Error sending withdrawal approval notification to doctor', err);
            }
        } catch (error: unknown) {
            await session.abortTransaction();
            logger.error('Error in approveWithdrawal', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Failed to approve withdrawal');
        } finally {
            session.endSession();
        }
    }

    async rejectWithdrawal(transactionId: string): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const transaction = await this._paymentRepository.getTransactionById(transactionId);
            if (!transaction) throw new NotFoundError('Transaction not found');

            if (transaction.status !== 'PENDING') {
                throw new ValidationError('Transaction is not pending');
            }

            const wallet = asPopulatedWallet(transaction.walletID);
            if (wallet) {
                wallet.isRequested = false;
                await wallet.save({ session });
            }

            transaction.status = 'REJECTED';
            transaction.message = 'Withdrawal request rejected by Admin';
            await transaction.save({ session });

            await session.commitTransaction();

            try {
                if (wallet) {
                    const doctorUserId = extractId(wallet.userId);
                    await NotificationHelper.notifyWithdrawalRejected(doctorUserId, transaction.amount, 'Request rejected by Admin');
                }
            } catch (err) {
                logger.error('Error sending withdrawal rejection notification to doctor', err);
            }
        } catch (error: unknown) {
            await session.abortTransaction();
            logger.error('Error in rejectWithdrawal', { error: getErrorMessage(error) });
            throw toServiceError(error, 'Failed to reject withdrawal');
        } finally {
            session.endSession();
        }
    }
}
