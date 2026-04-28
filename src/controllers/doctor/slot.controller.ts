import { Request, Response } from 'express';
import { ISlotService } from '../../services/interfaces/ISlotService';
import { HttpStatus } from '../../constants';
import logger from '../../logger';
import { AuthRequest } from '../../middleware/auth.middleware';

export class SlotController {
    private readonly _slotService: ISlotService;

    constructor(slotService: ISlotService) {
        this._slotService = slotService;
    }

    blockSlots = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
            }

            const { slotIds } = req.body;
            if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Slot IDs are required' });
            }

            const result = await this._slotService.blockSlots(userId, slotIds);
            if (result.success) {
                return res.status(HttpStatus.OK).json(result);
            }
            return res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Controller error blocking slots', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };

    unblockSlots = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
            }

            const { slotIds } = req.body;
            if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Slot IDs are required' });
            }

            const result = await this._slotService.unblockSlots(userId, slotIds);
            if (result.success) {
                return res.status(HttpStatus.OK).json(result);
            }
            return res.status(HttpStatus.BAD_REQUEST).json(result);
        } catch (error: any) {
            logger.error('Controller error unblocking slots', { error: error.message });
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    };
}
