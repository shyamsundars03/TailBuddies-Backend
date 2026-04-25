import Razorpay from 'razorpay';
import crypto from 'crypto';
import { IPaymentRepository } from '../../repositories/interfaces/IPaymentRepository';
import { IPaymentService, PaymentVerificationData } from '../interfaces/IPaymentService';
import { env } from '../../config/env';
import logger from '../../logger';
import mongoose from 'mongoose';
import { Appointment } from '../../models/appointment.model';
import { AppointmentStatus } from '../../enums/appointment-status.enum';
import { Slot } from '../../models/slot.model';
import { IWalletTransaction } from '../../models/wallet-transaction.model';

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

    async createRazorpayOrder(amount: number, appointmentId: string, userId: string): Promise<{ success: boolean; order?: any; message?: string }> {
        try {
            // If it's an appointment (not topup), check if it's still available
            if (appointmentId !== 'topup') {
                const appointment = await Appointment.findById(appointmentId).populate('slotId');
                if (!appointment) return { success: false, message: 'Appointment not found' };
                
                const slot = appointment.slotId as any;
                if (!slot || (slot.isBooked && appointment.status !== AppointmentStatus.PAYMENT_PENDING)) {
                    return { success: false, message: 'This slot is no longer available' };
                }
            }

            const options = {
                amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
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
            } catch (rzpErr: any) {
                logger.error('PaymentService: Razorpay API call failed', { 
                    error: rzpErr.message,
                    metadata: rzpErr.error || rzpErr
                });
                return { success: false, message: `Razorpay API Error: ${rzpErr.message}` };
            }
            
            // Create or update a pending payment record
            const paymentData: any = {
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

            return { success: true, order };
        } catch (error: any) {
            logger.error('PaymentService: Unexpected error in createRazorpayOrder', { 
                message: error.message, 
                stack: error.stack
            });
            return { success: false, message: 'Failed to create payment order' };
        }
    }

    async verifyRazorpaySignature(verificationData: PaymentVerificationData): Promise<{ success: boolean; message: string }> {
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
                // Update internal payment status to success
                const paymentRecord = await this._paymentRepository.updatePaymentStatus(razorpay_order_id, 'success', razorpay_payment_id, session);
                
                if (appointmentId === 'topup') {
                    if (paymentRecord) {
                        // Top up the wallet
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
                        
                        // Create wallet transaction
                        await this._paymentRepository.createWalletTransaction({
                            transactionID: `TXN_${Date.now()}_${razorpay_payment_id.slice(-4)}`,
                            walletID: wallet._id as mongoose.Types.ObjectId,
                            amount: paymentRecord.amount,
                            type: 'credit',
                            source: 'wallet-recharge' as any,
                            message: 'Wallet Top-up via Razorpay',
                        }, session);
                        
                        logger.info('Wallet top-up successful via Razorpay', { userId, amount: paymentRecord.amount });
                    }
                } else {
                    // Update appointment status to booked and mark as paid
                    const appointment = await Appointment.findById(appointmentId).session(session);
                    if (!appointment) throw new Error('Appointment not found');

                    const slot = await Slot.findById(appointment.slotId).session(session);
                    if (!slot || slot.isBooked) {
                        throw new Error('Slot is no longer available. Please contact support for refund if money was deducted.');
                    }

                    // Lock the slot now (deferred from creation)
                    slot.isBooked = true;
                    slot.status = 'booked';
                    await slot.save({ session });

                    appointment.status = AppointmentStatus.BOOKED;
                    appointment.paymentStatus = 'PAID';
                    appointment.paymentMethod = 'razorpay';
                    appointment.transactionID = razorpay_payment_id;
                    await appointment.save({ session });
                    
                    logger.info('Appointment payment successful via Razorpay', { appointmentId, paymentId: razorpay_payment_id });
                }

                await session.commitTransaction();
                return { success: true, message: 'Payment verified successfully' };
            } catch (error: any) {
                await session.abortTransaction();
                logger.error('Error during payment verification transaction', { error: error.message });
                return { success: false, message: 'Failed to finalize payment' };
            } finally {
                session.endSession();
            }
        } else {
            // Update payment status to failed
            await this._paymentRepository.updatePaymentStatus(razorpay_order_id, 'failed');
            
            // Do NOT cancel the appointment or unlock the slot here. 
            // We want to keep it as 'payment pending' for retries.
            logger.info('Payment verification failed, keeping appointment as payment pending for retry', { appointmentId });
            
            return { success: false, message: 'Invalid payment signature' };
        }
    }

    async getWallet(userId: string): Promise<{ success: boolean; wallet?: any; message?: string }> {
        try {
            let wallet = await this._paymentRepository.getWalletByUserId(userId);
            if (!wallet) {
                wallet = await this._paymentRepository.createWallet({ userId: new mongoose.Types.ObjectId(userId), balance: 0, holdAmount: 0 });
            }
            return { success: true, wallet };
        } catch (error: any) {
            logger.error('Error fetching wallet', { error: error.message });
            return { success: false, message: 'Failed to fetch wallet' };
        }
    }

    async processWalletPayment(userId: string, amount: number, appointmentId: string): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet || wallet.balance < amount) {
                return { success: false, message: 'Insufficient wallet balance' };
            }

            // Deduct balance
            await this._paymentRepository.updateWalletBalance(userId, amount, 'debit', session);

            // Record transaction
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

            // Fetch appointment for transaction details
            const appointment = await Appointment.findById(appointmentId).session(session);
            if (!appointment) throw new Error('Appointment not found');

            const slot = await Slot.findById(appointment.slotId).session(session);
            if (!slot || slot.isBooked) {
                throw new Error('Slot is no longer available');
            }

            // Create wallet transaction
            await this._paymentRepository.createWalletTransaction({
                transactionID: internalPaymentId,
                walletID: wallet._id as mongoose.Types.ObjectId,
                type: 'debit',
                source: 'appointment-payment' as any,
                amount: amount,
                paymentID: payment._id as mongoose.Types.ObjectId,
                appointmentID: appointment._id as mongoose.Types.ObjectId,
                humanReadableId: appointment.appointmentId,
                message: `Payment for appointment ${appointment.appointmentId}`
            }, session);

            // Lock the slot now (deferred from creation)
            slot.isBooked = true;
            slot.status = 'booked';
            await slot.save({ session });

            appointment.status = AppointmentStatus.BOOKED;
            appointment.paymentStatus = 'PAID';
            appointment.paymentMethod = 'wallet';
            appointment.transactionID = internalPaymentId;
            await appointment.save({ session });

            await session.commitTransaction();
            return { success: true, message: 'Payment successful using wallet' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error processing wallet payment', { error: error.message });
            return { success: false, message: 'Wallet payment failed' };
        } finally {
            session.endSession();
        }
    }

    async topUpWallet(userId: string, amount: number, transactionId: string): Promise<{ success: boolean; message: string }> {
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
                source: 'wallet-recharge' as any,
                amount: amount,
                paymentID: payment._id as mongoose.Types.ObjectId,
                message: 'Wallet top-up successful'
            }, session);

            await session.commitTransaction();
            return { success: true, message: 'Wallet topped up successfully' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error topping up wallet', { error: error.message });
            return { success: false, message: 'Wallet top-up failed' };
        } finally {
            session.endSession();
        }
    }

    async processCashPayment(appointmentId: string, userId: string): Promise<{ success: boolean; message: string }> {
        try {
            const internalPaymentId = `CASH_${Date.now()}_${appointmentId.toString().slice(-4)}`;
            await this._paymentRepository.createPayment({
                paymentID: internalPaymentId,
                ownerID: new mongoose.Types.ObjectId(userId),
                appointmentID: new mongoose.Types.ObjectId(appointmentId),
                amount: 0, // Will be paid at clinic
                purpose: 'consultation',
                method: 'cash',
                paymentStatus: 'pending',
                paymentDate: new Date()
            });

            // For cash, it's immediately booked
            await Appointment.findByIdAndUpdate(appointmentId, { status: AppointmentStatus.BOOKED });

            return { success: true, message: 'Proceed with cash payment at clinic' };
        } catch (error: any) {
            logger.error('Error processing cash payment', { error: error.message });
            return { success: false, message: 'Failed to process cash payment option' };
        }
    }

    async getTransactions(userId: string, page: number, limit: number): Promise<{ success: boolean; transactions?: any[]; total?: number; message?: string }> {
        try {
            const wallet = await this._paymentRepository.getWalletByUserId(userId);
            if (!wallet) return { success: true, transactions: [], total: 0 };

            const { transactions, total } = await this._paymentRepository.getWalletTransactions(wallet._id.toString(), page, limit);
            return { success: true, transactions, total };
        } catch (error: any) {
            logger.error('Error fetching transactions', { error: error.message });
            return { success: false, message: 'Failed to fetch transactions' };
        }
    }

    async retryPayment(appointmentId: string, method: string): Promise<{ success: boolean; order?: any; message?: string }> {
        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) return { success: false, message: 'Appointment not found' };

            // We need the amount. Assuming we can get it from somewhere or it's standard fees.
            // For now, let's assume we need to pass the amount or fetch from doctor profile.
            // This needs to be robust.
            
            if (method === 'razorpay') {
                return { success: false, message: 'Retry logic for Razorpay triggered. Fetching details...' };
            }

            return { success: false, message: 'Invalid retry method' };
        } catch (error: any) {
            logger.error('Error retrying payment', { error: error.message });
            return { success: false, message: 'Failed to retry payment' };
        }
    }

    async refund(appointmentId: string, reason: string, externalSession?: mongoose.ClientSession): Promise<{ success: boolean; message: string }> {
        const session = externalSession || await mongoose.startSession();
        if (!externalSession) session.startTransaction();
        try {
            const appointment = await Appointment.findById(appointmentId).session(session);
            if (!appointment) throw new Error('Appointment not found');
            if (appointment.paymentStatus !== 'PAID') throw new Error('Appointment is not paid');

            const userId = (appointment.ownerId as any)._id?.toString() || appointment.ownerId.toString();
            const amount = appointment.totalAmount;

            // Credit back to wallet
            await this._paymentRepository.updateWalletBalance(userId, amount, 'credit', session);

            // Record transaction
            const wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet) throw new Error('Wallet not found');

            await (this._paymentRepository as any).createWalletTransaction({
                transactionID: `REF_${Date.now()}`,
                walletID: wallet._id,
                type: 'credit',
                source: 'appointment-refund' as any,
                amount: amount,
                appointmentID: appointment._id as mongoose.Types.ObjectId,
                humanReadableId: appointment.appointmentId,
                message: `Refund for appointment ${appointment.appointmentId}: ${reason}`
            }, session);

            // Update appointment payment status
            await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: 'REFUNDED' }, { session });
            if (!externalSession) await session.commitTransaction();
            return { success: true, message: 'Refund processed to wallet successfully' };
        } catch (error: any) {
            if (!externalSession) await session.abortTransaction();
            logger.error('Error in refund method', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            if (!externalSession) session.endSession();
        }
    }

    async getAllTransactions(page: number, limit: number, search?: string, status?: string): Promise<{ success: boolean; transactions?: IWalletTransaction[]; total?: number; message?: string }> {
        try {
            const { transactions, total } = await this._paymentRepository.findAllWalletTransactions(page, limit, search, status);
            return { success: true, transactions, total };
        } catch (error: any) {
            logger.error('Error fetching admin transactions', { error: error.message });
            return { success: false, message: 'Failed to fetch admin transactions' };
        }
    }

    async getTransactionDetail(id: string): Promise<{ success: boolean; transaction?: IWalletTransaction; message?: string }> {
        try {
            const transaction = await this._paymentRepository.getTransactionById(id);
            if (!transaction) {
                return { success: false, message: 'Transaction not found' };
            }
            return { success: true, transaction };
        } catch (error: any) {
            logger.error('Error fetching transaction detail', { error: error.message });
            return { success: false, message: 'Failed to fetch transaction detail' };
        }
    }

    async creditDoctorWallet(userId: string, amount: number, appointmentId: string, humanReadableId: string): Promise<{ success: boolean; message: string }> {
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

            await this._paymentRepository.updateWalletBalance(userId, amount, 'credit', session);

            const txnId = `DOC_CREDIT_${Date.now()}_${appointmentId.slice(-4)}`;
            await (this._paymentRepository as any).createWalletTransaction({
                transactionID: txnId,
                walletID: wallet._id,
                type: 'credit',
                source: 'appointment-payment' as any,
                amount: amount,
                appointmentID: new mongoose.Types.ObjectId(appointmentId),
                humanReadableId: humanReadableId,
                message: `Consultation fee for ${humanReadableId}`
            }, session);

            await session.commitTransaction();
            return { success: true, message: 'Doctor wallet credited' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error crediting doctor wallet', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async requestWithdrawal(userId: string, amount: number): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this._paymentRepository.getWalletByUserId(userId, session);
            if (!wallet || wallet.balance < amount) {
                return { success: false, message: 'Insufficient wallet balance' };
            }

            const commission = amount * 0.1;
            const netAmount = amount - commission;

            // Scenario: All withdrawals now require Admin approval
            wallet.isRequested = true;
            await wallet.save({ session });

            const txnId = `REQ_${Date.now()}`;
            await (this._paymentRepository as any).createWalletTransaction({
                transactionID: txnId,
                walletID: wallet._id,
                type: 'requested',
                status: 'PENDING',
                source: 'withdrawal' as any,
                amount: amount,
                grossAmount: amount,
                commission: commission,
                netAmount: netAmount,
                message: `Withdrawal requested (Pending Admin Approval). Net Payout: ₹${netAmount} after 10% company share.`
            }, session);

            await session.commitTransaction();
            return { success: true, message: 'Withdrawal request submitted for Admin approval' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error in requestWithdrawal', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async approveWithdrawal(transactionId: string): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const transaction = await this._paymentRepository.getTransactionById(transactionId);
            
            if (!transaction) {
                return { success: false, message: 'Transaction not found' };
            }

            if (transaction.status !== 'PENDING' || transaction.type !== 'requested') {
                return { success: false, message: 'Transaction is not in a pending requested state' };
            }

            const wallet = transaction.walletID as any;
            if (!wallet) {
                return { success: false, message: 'Associated wallet not found' };
            }

            // 1. Deduct amount from wallet balance (since it was only requested before)
            if (wallet.balance < transaction.amount) {
                return { success: false, message: 'Insufficient wallet balance for this withdrawal' };
            }

            wallet.balance -= transaction.amount;
            wallet.isRequested = false;
            await wallet.save({ session });

            // 2. Update transaction status and type
            transaction.status = 'COMPLETED';
            transaction.type = 'debit';
            transaction.message = 'Withdrawal approved by Admin';
            await transaction.save({ session });

            await session.commitTransaction();
            return { success: true, message: 'Withdrawal approved successfully' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error in approveWithdrawal', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    async rejectWithdrawal(transactionId: string): Promise<{ success: boolean; message: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const transaction = await this._paymentRepository.getTransactionById(transactionId);
            
            if (!transaction) {
                return { success: false, message: 'Transaction not found' };
            }

            if (transaction.status !== 'PENDING') {
                return { success: false, message: 'Transaction is not pending' };
            }

            const wallet = transaction.walletID as any;
            if (wallet) {
                wallet.isRequested = false;
                await wallet.save({ session });
            }

            transaction.status = 'REJECTED';
            transaction.message = 'Withdrawal request rejected by Admin';
            await transaction.save({ session });

            await session.commitTransaction();
            return { success: true, message: 'Withdrawal request rejected' };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error in rejectWithdrawal', { error: error.message });
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }
}
