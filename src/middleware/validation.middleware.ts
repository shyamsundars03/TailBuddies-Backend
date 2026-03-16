import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { HttpStatus } from '../constants';

export const validateRegistration = [




  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')
    .isNumeric().withMessage('Phone number must contain only numbers'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    

  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender value'),

  body('role')
    .optional()
    .isIn(['owner', 'doctor', 'admin']).withMessage('Invalid role value'),



    
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },




];