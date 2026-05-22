import { Response } from 'express';
import { ISlotService } from '../../services/interfaces/ISlotService';
import { HttpStatus } from '../../constants';
import { AuthenticatedRequest } from '../../interfaces/express-request.interface';
import { ApiResponse } from '../../utils/api-response';
import { UnauthorizedError } from '../../errors/app-error';
import { z } from 'zod';

const BatchSlotSchema = z.object({
    slotIds: z.array(z.string()).min(1, "At least one slot ID is required"),
});

export class SlotController {
    private readonly _slotService: ISlotService;

    constructor(slotService: ISlotService) {
        this._slotService = slotService;
    }

    blockSlots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { slotIds } = BatchSlotSchema.parse(req.body);
        const result = await this._slotService.blockSlots(userId, slotIds);
        res.status(HttpStatus.OK).json(ApiResponse.success(result.message || 'Slots blocked successfully', result));
    };

    unblockSlots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) throw new UnauthorizedError();

        const { slotIds } = BatchSlotSchema.parse(req.body);
        const result = await this._slotService.unblockSlots(userId, slotIds);
        res.status(HttpStatus.OK).json(ApiResponse.success(result.message || 'Slots unblocked successfully', result));
    };
}
