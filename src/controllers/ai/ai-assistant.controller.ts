import { Response } from 'express';
import { IAiAssistantService } from '../../services/interfaces/IAiAssistantService';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import { HttpStatus } from '../../constants';
import { UnauthorizedError } from '../../errors/app-error';
import { AnalyzeIssueInput } from '../../dto/ai/ai.schema';

export class AiAssistantController {
    private readonly _aiAssistantService: IAiAssistantService;

    constructor(aiAssistantService: IAiAssistantService) {
        this._aiAssistantService = aiAssistantService;
    }

    analyze = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { category, petId, description } = req.body as AnalyzeIssueInput;

        const results = await this._aiAssistantService.analyzeIssue(
            userId,
            category,
            petId,
            description
        );

        res.status(HttpStatus.OK).json(ApiResponse.success('AI analysis completed', results));
    };
}
