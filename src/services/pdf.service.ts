import { IPdfService } from './interfaces/IPdfService';
import logger from '../logger';

export class PdfService implements IPdfService {
    async generatePrescriptionPdf(prescription: any, appointment: any): Promise<Buffer> {
        logger.warn('PDF generation is temporarily disabled due to dependency issues.');
        throw new Error('PDF generation is temporarily disabled. Please try again later.');
    }
}
