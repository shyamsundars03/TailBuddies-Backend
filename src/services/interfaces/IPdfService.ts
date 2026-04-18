export interface IPdfService {
    generatePrescriptionPdf(prescription: any, appointment: any): Promise<Buffer>;
}
