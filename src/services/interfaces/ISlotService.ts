export interface ISlotService {
    blockSlots(userId: string, slotIds: string[]): Promise<{ message: string }>;
    unblockSlots(userId: string, slotIds: string[]): Promise<{ message: string }>;
}
