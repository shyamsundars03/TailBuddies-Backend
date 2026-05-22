import { ISlot } from '../../models/slot.model';
import { IBaseRepository } from '../base/base.repository.interface';

import { ClientSession } from 'mongoose';

export interface ISlotRepository extends IBaseRepository<ISlot> {
    deleteMany(filter: Record<string, unknown>): Promise<boolean>;
    findByIdWithSession(id: string, session: ClientSession): Promise<ISlot | null>;
    updateWithSession(id: string, data: Partial<ISlot>, session: ClientSession): Promise<ISlot | null>;
}
