import { AuthController } from '../controllers/auth/auth.controller';
import { AuthService } from '../services/auth/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';

// Repositories
const userRepository = new UserRepository();

// Services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepository, jwtService, emailService);

// Controllers
const authController = new AuthController(authService);

export {
    authController,
};
