import { IDoctor } from '../../models/doctor.model';

export interface AiAnalysisResult {
    identifiedSpecialty: string;
    carePlan: string;
    suggestedDoctors: IDoctor[];
}

export interface IAiAssistantService {
    analyzeIssue(userId: string, category: string, petId: string, description: string): Promise<AiAnalysisResult>;
}
