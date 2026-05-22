import { z } from 'zod';

export const CreateOrderSchema = z.object({
    amount: z.number().positive(),
    appointmentId: z.string(),
});

export const VerifyPaymentSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
    appointmentId: z.string().min(1, 'Appointment reference is required'),
});

export const WithdrawRequestSchema = z.object({
    amount: z.number().positive(),
});

export const RetryPaymentSchema = z.object({
    appointmentId: z.string().min(24, 'Invalid Appointment ID'),
    method: z.enum(['razorpay', 'wallet']),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type WithdrawRequestInput = z.infer<typeof WithdrawRequestSchema>;
export type RetryPaymentInput = z.infer<typeof RetryPaymentSchema>;
