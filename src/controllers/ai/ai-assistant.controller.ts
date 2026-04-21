import { Request, Response } from "express";
import { AiAssistantService } from "../../services/ai/ai-assistant.service";

export class AiAssistantController {
    constructor(private aiAssistantService: AiAssistantService) {}

    async analyze(req: Request, res: Response) {
        try {
            const { category, petId, description } = req.body;
            const userId = (req as any).user.userId;

            if (!category || !petId || !description) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Category, petId, and description are required." 
                });
            }

            const results = await this.aiAssistantService.analyzeIssue(
                userId,
                category,
                petId,
                description
            );

            return res.status(200).json({
                success: true,
                data: results
            });
        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred during AI analysis."
            });
        }
    }
}
