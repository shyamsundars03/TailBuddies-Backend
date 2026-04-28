import Groq from "groq-sdk";
import { IPetRepository } from "../../repositories/interfaces/IPetRepository";
import { IDoctorRepository } from "../../repositories/interfaces/IDoctorRepository";
import { ISpecialtyRepository } from "../../repositories/interfaces/ISpecialtyRepository";

export class AiAssistantService {
    private groq: Groq;
    private model: string = "llama-3.3-70b-versatile";

    constructor(
        private petRepository: IPetRepository,
        private doctorRepository: IDoctorRepository,
        private specialtyRepository: ISpecialtyRepository
    ) {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }

    async analyzeIssue(userId: string, category: string, petId: string, description: string) {
        // 1. Validate Pet & Owner
        const pet = await this.petRepository.findById(petId);
        if (!pet) throw new Error("Pet not found");
        
        const petOwnerId = pet.ownerId && (pet.ownerId as any)._id 
            ? (pet.ownerId as any)._id.toString() 
            : pet.ownerId.toString();

        if (petOwnerId !== userId) {
            throw new Error("Unauthorized access to this pet");
        }

        // 2. Fetch Available Specialties for Context
        const availableSpecialties = await (this.specialtyRepository as any).findAll();
        const specialtyNames = (availableSpecialties as any[]).map(s => s.name).join(', ');

        // 3. Prepare Prompt
        const prompt = `You are an expert AI Veterinary Assistant for TailBuddies. 
        Pet Name: ${pet.name}. 
        Category: ${category}. 
        Symptoms/Description: ${description}.
        
        AVAILABLE SPECIALTIES IN OUR SYSTEM: ${specialtyNames}

        Please provide a helpful response in TWO parts:
        1. An EXACT veterinary specialty from our available list that best fits this issue. Return ONLY the name.
        2. A one-week home care and observation plan (Markdown format).
        
        FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
        SPECIALTY: [Specialty Name]
        ---
        PLAN: 
        [The Markdown Care Plan]`;

        // 3. Call Groq
        const chatCompletion = await this.groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a professional veterinary assistant. Always be precise and helpful." },
                { role: "user", content: prompt }
            ],
            model: this.model,
            temperature: 0.5,
        });

        const content = chatCompletion.choices[0]?.message?.content || "";
        
        const specialtyMatch = content.match(/SPECIALTY:\s*(.*)/i);
        const planMatch = content.split(/---/i)[1]?.replace(/PLAN:\s*/i, '');
        
        const specialtyName = specialtyMatch ? specialtyMatch[1].trim() : "General Vet";
        const carePlan = planMatch ? planMatch.trim() : content;

        // 4. Find matching Specialty ID & Doctors
        let doctors: any[] = [];
        const specialtyDoc = await this.specialtyRepository.findByName(specialtyName);
        
        if (specialtyDoc) {
            doctors = await this.doctorRepository.findAll(
                { "profile.specialtyId": specialtyDoc._id, isActive: true },
                { limit: 4 }
            );
        } else {
            // Fallback: search for any doctor if specialty not found exactly
            doctors = await this.doctorRepository.findAll({ isActive: true }, { limit: 4 });
        }

        return {
            identifiedSpecialty: specialtyName,
            carePlan,
            suggestedDoctors: doctors
        };
    }
}
