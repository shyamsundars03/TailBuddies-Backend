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
  dbName?: string; 
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  jwtRefreshMaxAge: number;
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
       dbName: process.env.MONGO_URI ? 
    process.env.MONGO_URI.split('/').pop()?.split('?')[0] : undefined,
      jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      jwtRefreshMaxAge: this.parseDurationToMs(process.env.JWT_REFRESH_EXPIRY || '7d'),
    };
  }

  validate(): EnvConfig {
    

    Object.entries(this.config).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        this.errors.push(`Missing: ${key}`);
      }
    });

    
    


  this.validatePort();
  this.validateMongoUri();
  this.validateNodeEnv();
  this.validateSmtpPort();
  this.validateDuration('jwtAccessExpiry');
  this.validateDuration('jwtRefreshExpiry');




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

  private validateDuration(key: keyof EnvConfig) {
    const duration = this.config[key] as string;
    if (duration && !duration.match(/^(\d+)([smhd])$/)) {
      this.errors.push(`${key} must be in format like '15m', '1h', or '7d'`);
    }
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }
}

export const env = new EnvValidator().validate();