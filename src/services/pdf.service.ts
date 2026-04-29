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
            // pdfmake 0.3.x uses a unified instance exported by the module
            const pdfmake = PdfPrinter;

            // Set fonts on the instance
            pdfmake.setFonts(this.fonts);

            // Security: Disable external URL access for PDF generation (resolves warning)
            pdfmake.setUrlAccessPolicy(() => false);

            const docDefinition: TDocumentDefinitions = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                content: [
                    // Header Section with Logo/Name
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'TailBuddies', style: 'brand' },
                                    { text: 'VETERINARY CONSULTATION REPORT', style: 'title' }
                                ],
                                width: '*'
                            },
                            {
                                stack: [
                                    { text: `Report ID: ${prescription.prescriptionId || 'N/A'}`, alignment: 'right', style: 'tiny' },
                                    { text: `Date: ${new Date(prescription.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, alignment: 'right', style: 'tiny' }
                                ],
                                width: 'auto'
                            }
                        ]
                    },
                    { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#f1f5f9' }], margin: [0, 10, 0, 30] },

                    // Entities Row
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'CONSULTING VETERINARIAN', style: 'sectionLabel' },
                                    { text: `Dr. ${appointment.doctorId?.userId?.username || 'N/A'}`, style: 'boldText' },
                                    { text: appointment.doctorId?.profile?.designation || 'Veterinary Surgeon', style: 'mutedText' },
                                    { text: `License: ${appointment.doctorId?.profile?.licenseNumber || 'N/A'}`, style: 'mutedText' }
                                ]
                            },
                            {
                                stack: [
                                    { text: 'PATIENT DETAILS', style: 'sectionLabel' },
                                    { text: `${appointment.petId?.name || 'N/A'}`, style: 'boldText' },
                                    { text: `${appointment.petId?.species || 'N/A'} (${appointment.petId?.breed || 'N/A'})`, style: 'mutedText' },
                                    { text: `Gender: ${appointment.petId?.gender || 'N/A'} | Age: ${appointment.petId?.age || 'N/A'}`, style: 'mutedText' }
                                ],
                                alignment: 'right'
                            }
                        ]
                    },

                    // Vitals Bar
                    {
                        margin: [0, 30, 0, 30],
                        table: {
                            widths: ['*', '*', '*'],
                            body: [
                                [
                                    {
                                        stack: [
                                            { text: 'TEMPERATURE', style: 'vitalsLabel' },
                                            { text: prescription.vitals?.temperature ? `${prescription.vitals.temperature}°C` : 'N/A', style: 'vitalsValue' }
                                        ],
                                        fillColor: '#f8fafc',
                                        border: [false, false, false, false]
                                    },
                                    {
                                        stack: [
                                            { text: 'PULSE RATE', style: 'vitalsLabel' },
                                            { text: prescription.vitals?.pulse ? `${prescription.vitals.pulse} BPM` : 'N/A', style: 'vitalsValue' }
                                        ],
                                        fillColor: '#f8fafc',
                                        border: [false, false, false, false]
                                    },
                                    {
                                        stack: [
                                            { text: 'RESPIRATION', style: 'vitalsLabel' },
                                            { text: prescription.vitals?.respiration ? `${prescription.vitals.respiration} BRPM` : 'N/A', style: 'vitalsValue' }
                                        ],
                                        fillColor: '#f8fafc',
                                        border: [false, false, false, false]
                                    }
                                ]
                            ]
                        }
                    },

                    // Clinical Findings & Symptoms
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'CLINICAL FINDINGS', style: 'sectionHeader' },
                                    { text: prescription.clinicalFindings || 'No findings recorded.', style: 'paragraph' }
                                ],
                                width: '*'
                            },
                            {
                                stack: [
                                    { text: 'REPORTED SYMPTOMS', style: 'sectionHeader' },
                                    { text: (prescription.symptoms || []).join(', ') || 'None reported.', style: 'paragraph' }
                                ],
                                width: '40%',
                                margin: [20, 0, 0, 0]
                            }
                        ]
                    },

                    // Diagnosis
                    {
                        stack: [
                            { text: 'DIAGNOSIS', style: 'sectionHeader', margin: [0, 25, 0, 10] },
                            { text: prescription.diagnosis || 'Pending evaluation.', style: 'diagnosisText' }
                        ]
                    },

                    // Medications Table
                    { text: 'PRESCRIBED MEDICATIONS', style: 'sectionHeader', margin: [0, 30, 0, 10] },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'MEDICINE NAME', style: 'tableHeader' },
                                    { text: 'DOSAGE', style: 'tableHeader' },
                                    { text: 'FREQUENCY', style: 'tableHeader' },
                                    { text: 'DURATION', style: 'tableHeader' }
                                ],
                                ...(prescription.medications || []).map((m: any) => [
                                    { text: m.name, style: 'medName' },
                                    { text: m.dosage, style: 'medText' },
                                    { text: m.frequency, style: 'medText' },
                                    { text: m.duration, style: 'medText' }
                                ])
                            ]
                        },
                        layout: {
                            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                            vLineWidth: () => 0,
                            hLineColor: (i: number) => (i === 0 || i === 1) ? '#002B49' : '#f1f5f9',
                            paddingLeft: () => 10,
                            paddingRight: () => 10,
                            paddingTop: (i: number) => i === 0 ? 8 : 10,
                            paddingBottom: (i: number) => i === 0 ? 8 : 10,
                        }
                    },

                    // Notes & Advice
                    {
                        stack: [
                            { text: 'VET ADVICE & NOTES', style: 'sectionHeader', margin: [0, 30, 0, 5] },
                            { text: prescription.vetNotes || 'N/A', style: 'paragraph', italics: true, color: '#64748b' }
                        ]
                    },

                    // Footer / Signature
                    {
                        margin: [0, 60, 0, 0],
                        columns: [
                            { width: '*', text: '' },
                            {
                                width: 'auto',
                                stack: [
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },
                                    { text: 'AUTHORIZED SIGNATURE', style: 'tiny', margin: [0, 5, 0, 2], alignment: 'center' },
                                    { text: `Dr. ${appointment.doctorId?.userId?.username}`, style: 'boldText', alignment: 'center', color: '#002B49' }
                                ]
                            }
                        ]
                    }
                ],
                styles: {
                    brand: { fontSize: 24, font: 'Roboto', bold: true, color: '#002B49' },
                    title: { fontSize: 10, font: 'Roboto', bold: true, color: '#3b82f6', margin: [0, 2, 0, 0] },
                    sectionLabel: { fontSize: 8, font: 'Roboto', bold: true, color: '#94a3b8', margin: [0, 0, 0, 4] },
                    sectionHeader: { fontSize: 10, font: 'Roboto', bold: true, color: '#002B49', margin: [0, 10, 0, 8] },
                    boldText: { fontSize: 12, font: 'Roboto', bold: true, color: '#1e293b' },
                    mutedText: { fontSize: 9, font: 'Roboto', color: '#64748b', margin: [0, 1, 0, 0] },
                    vitalsLabel: { fontSize: 7, font: 'Roboto', bold: true, color: '#94a3b8', margin: [0, 0, 0, 2] },
                    vitalsValue: { fontSize: 12, font: 'Roboto', bold: true, color: '#3b82f6' },
                    tableHeader: { fontSize: 8, font: 'Roboto', bold: true, color: '#ffffff', fillColor: '#002B49', margin: [0, 2, 0, 2] },
                    medName: { fontSize: 10, font: 'Roboto', bold: true, color: '#1e293b' },
                    medText: { fontSize: 9, font: 'Roboto', color: '#64748b' },
                    diagnosisText: { fontSize: 11, font: 'Roboto', bold: true, color: '#3b82f6', margin: [10, 8, 10, 8], fillColor: '#eff6ff' },
                    paragraph: { fontSize: 10, font: 'Roboto', color: '#334155', lineHeight: 1.4 },
                    tiny: { fontSize: 7, font: 'Roboto', color: '#94a3b8' }
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            };

            // createPdf returns an OutputDocument instance
            const pdfDoc = pdfmake.createPdf(docDefinition);

            // getBuffer() returns a Promise<Buffer>
            return await pdfDoc.getBuffer();
        } catch (error: any) {
            logger.error('Error in PdfService.generatePrescriptionPdf', { error: error.message });
            throw error;
        }
    }
}
