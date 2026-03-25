import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

// Configure Cloudinary
cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
});

// Configure (Images)
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'tailbuddies/profiles',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    } as any,
});

// Configure (PDFs)
const documentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'tailbuddies/documents',
        allowed_formats: ['pdf', 'jpg', 'png', 'jpeg'],
        resource_type: 'auto',
    } as any,
});

export const upload = multer({ 
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

export const uploadDoc = multer({ 
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});
