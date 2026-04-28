import { IPdfService } from './interfaces/IPdfService';
import logger from '../logger';
const PdfPrinter = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';

export class PdfService implements IPdfService {
    private fonts = {
        Roboto: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique'
        }
    };

    async generatePrescriptionPdf(prescription: any, appointment: any): Promise<Buffer> {
        try {
            const printer = new PdfPrinter(this.fonts);

            const docDefinition: TDocumentDefinitions = {
                content: [
                    {
                        columns: [
                            {
                                text: 'TailBuddies Veterinary Portal',
                                style: 'header',
                                width: '*'
                            },
                            {
                                text: `Date: ${new Date().toLocaleDateString()}`,
                                alignment: 'right',
                                style: 'subheader'
                            }
                        ]
                    },
                    { text: '_______________________________________________________________________________________________', margin: [0, 10, 0, 20] },
                    
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'DOCTOR DETAILS', style: 'sectionHeader' },
                                    { text: `Dr. ${appointment.doctorId?.userId?.username || 'N/A'}`, style: 'boldText' },
                                    { text: appointment.doctorId?.profile?.designation || 'Veterinary Surgeon' },
                                    { text: `Email: ${appointment.doctorId?.userId?.email || 'N/A'}` },
                                    { text: `Phone: ${appointment.doctorId?.userId?.phone || 'N/A'}` }
                                ]
                            },
                            {
                                stack: [
                                    { text: 'PET DETAILS', style: 'sectionHeader' },
                                    { text: `${appointment.petId?.name || 'N/A'}`, style: 'boldText' },
                                    { text: `Species: ${appointment.petId?.species || 'N/A'}` },
                                    { text: `Breed: ${appointment.petId?.breed || 'N/A'}` },
                                    { text: `Gender: ${appointment.petId?.gender || 'N/A'}` }
                                ],
                                alignment: 'right'
                            }
                        ]
                    },

                    { text: 'CONSULTATION SUMMARY', style: 'sectionHeader', margin: [0, 30, 0, 10] },
                    {
                        table: {
                            widths: ['*', '*'],
                            body: [
                                [{ text: 'Appointment ID', style: 'tableHeader' }, { text: 'Date & Time', style: 'tableHeader' }],
                                [appointment.appointmentId || appointment._id.toString(), `${new Date(appointment.appointmentDate).toLocaleDateString()} ${appointment.appointmentStartTime}`]
                            ]
                        },
                        layout: 'lightHorizontalLines'
                    },

                    { text: 'MEDICAL VITALS', style: 'sectionHeader', margin: [0, 20, 0, 10] },
                    {
                        columns: [
                            { text: `Weight: ${prescription.vitals?.weight || 'N/A'} kg` },
                            { text: `Temperature: ${prescription.vitals?.temperature || 'N/A'} °F` },
                            { text: `Pulse: ${prescription.vitals?.pulse || 'N/A'} BPM` }
                        ]
                    },

                    { text: 'DIAGNOSIS & RECOMMENDATIONS', style: 'sectionHeader', margin: [0, 20, 0, 10] },
                    { text: prescription.recommendation || 'No specific recommendations provided.', style: 'paragraph' },

                    { text: 'PRESCRIBED MEDICATIONS', style: 'sectionHeader', margin: [0, 20, 0, 10] },
                    {
                        table: {
                            widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'Medicine', style: 'tableHeader' },
                                    { text: 'Dosage', style: 'tableHeader' },
                                    { text: 'Frequency', style: 'tableHeader' },
                                    { text: 'Duration', style: 'tableHeader' }
                                ],
                                ...(prescription.medications || []).map((m: any) => [
                                    m.name,
                                    m.dosage,
                                    m.frequency,
                                    m.duration
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines'
                    },

                    { text: 'Notes', style: 'sectionHeader', margin: [0, 20, 0, 5] },
                    { text: prescription.notes || 'N/A', style: 'paragraph' },

                    { text: '\n\n\n\n' },
                    { text: '__________________________', alignment: 'right' },
                    { text: 'Authorized Signature', alignment: 'right', style: 'tiny' },
                    { text: `Dr. ${appointment.doctorId?.userId?.username}`, alignment: 'right', style: 'boldText' }
                ],
                styles: {
                    header: { fontSize: 22, bold: true, color: '#002B49' },
                    subheader: { fontSize: 10, color: '#666' },
                    sectionHeader: { fontSize: 12, bold: true, color: '#3b82f6', margin: [0, 10, 0, 5], decoration: 'underline' },
                    boldText: { bold: true, fontSize: 11 },
                    tableHeader: { bold: true, fontSize: 10, color: '#444', fillColor: '#f8fafc' },
                    paragraph: { fontSize: 10, lineHeight: 1.5 },
                    tiny: { fontSize: 8, color: '#999' }
                },
                defaultStyle: {
                    fontSize: 10,
                    color: '#333'
                }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            
            return new Promise((resolve, reject) => {
                const chunks: Buffer[] = [];
                pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err: any) => reject(err));
                pdfDoc.end();
            });
        } catch (error: any) {
            logger.error('Error in PdfService.generatePrescriptionPdf', { error: error.message });
            throw error;
        }
    }
}
