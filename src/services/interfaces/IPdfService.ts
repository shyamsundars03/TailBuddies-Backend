export interface IPdfService {
    generatePrescriptionPdf(prescription: unknown, appointment: unknown): Promise<Buffer>;
}
