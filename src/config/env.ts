import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtResetSecret: string;
  googleClientId: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  frontendUrl: string;
}

class EnvValidator {
  private config: Partial<EnvConfig> = {};
  private errors: string[] = [];

  constructor() {
    this.config = {
      port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
      nodeEnv: process.env.NODE_ENV,
      mongoUri: process.env.MONGO_URI,
      jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      jwtResetSecret: process.env.JWT_RESET_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
      frontendUrl: process.env.FRONTEND_URL,
    };
  }

  validate(): EnvConfig {
    // Check existence
    Object.entries(this.config).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        this.errors.push(`Missing: ${key}`);
      }
    });

    // Specific validations
    this.validatePort();
    this.validateMongoUri();
    this.validateNodeEnv();
    this.validateSmtpPort();

    if (this.errors.length > 0) {
      throw new Error(
        'Environment validation failed:\n' + 
        this.errors.map(e => `  • ${e}`).join('\n')
      );
    }

    return this.config as EnvConfig;
  }

  private validatePort() {
    const port = this.config.port;
    if (port && (port < 1024 || port > 65535)) {
      this.errors.push('PORT must be between 1024 and 65535');
    }
  }

  private validateMongoUri() {
    const uri = this.config.mongoUri;
    if (uri && !uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      this.errors.push('MONGO_URI must start with mongodb:// or mongodb+srv://');
    }
  }

  private validateNodeEnv() {
    const env = this.config.nodeEnv;
    if (env && !['development', 'production', 'test'].includes(env)) {
      this.errors.push('NODE_ENV must be development, production, or test');
    }
  }

  private validateSmtpPort() {
    const port = this.config.smtpPort;
    if (port && (port < 1 || port > 65535)) {
      this.errors.push('SMTP_PORT must be a valid port number');
    }
  }
}

export const env = new EnvValidator().validate();