export const ErrorMessages = {
  // Server
  INTERNAL_SERVER: 'Internal server error',
  
  // Auth
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden: Insufficient permissions',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_MISSING: 'No token provided',
  TOKEN_INVALID: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  USER_NOT_FOUND: 'User not found',
  EMAIL_EXISTS: 'Email already registered',
  PHONE_EXISTS: 'Phone number already registered',
  ACCOUNT_BLOCKED: 'Account is blocked',
  ACCOUNT_NOT_VERIFIED: 'Account not verified',
  
  // Validation
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number',
  PASSWORD_WEAK: 'Password must be at least 8 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  REQUIRED_FIELD: 'This field is required',
  
  // Resource
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  
  // Database
  DB_CONNECTION: 'Database connection error',
  DB_QUERY: 'Database query error',
  
  // File
  FILE_TOO_LARGE: 'File too large',
  FILE_INVALID_TYPE: 'Invalid file type',
  FILE_UPLOAD_FAILED: 'File upload failed',
} as const;

export const SuccessMessages = {
  // Auth
  LOGIN: 'Login successful',
  LOGOUT: 'Logout successful',
  REGISTER: 'Registration successful',
  EMAIL_VERIFIED: 'Email verified successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET: 'Password reset link sent',
  
  // OTP
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',
  
  // User
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  
  // General
  FETCH_SUCCESS: 'Data fetched successfully',
  OPERATION_SUCCESS: 'Operation completed successfully',
} as const;