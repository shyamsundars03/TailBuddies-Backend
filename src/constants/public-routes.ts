/**
 * Routes intentionally exposed without auth middleware.
 * All other `/api/*` routes require a bearer token unless noted in route files.
 */
export const PUBLIC_API_ROUTES = [
    'POST /api/auth/signup',
    'POST /api/auth/signin',
    'POST /api/auth/google-login',
    'POST /api/auth/verify-otp',
    'POST /api/auth/resend-otp',
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
    'POST /api/auth/refresh-token',
    'POST /api/auth/logout',
    'GET /api/auth/specialties',
    'GET /api/auth/doctors',
    'GET /api/auth/doctors/:id',
    'POST /api/admin/signin',
    'GET /api/reviews/doctor/:doctorId',
] as const;
