export interface ISlotService {
    blockSlots(userId: string, slotIds: string[]): Promise<{ success: boolean; message: string }>;
    unblockSlots(userId: string, slotIds: string[]): Promise<{ success: boolean; message: string }>;
}
