import { Slot, ISlot } from '../models/slot.model';
import { BaseRepository } from './base/base.repository';
import { ISlotRepository } from './interfaces/ISlotRepository';

export class SlotRepository extends BaseRepository<ISlot> implements ISlotRepository {
  constructor() {
    super(Slot);
  }

  async deleteMany(filter: Record<string, unknown>): Promise<boolean> {
    const result = await this._model.deleteMany(filter);
    return result.acknowledged;
  }

  async findByIdWithSession(id: string, session: any): Promise<ISlot | null> {
    return await this._model.findById(id).session(session);
  }

  async updateWithSession(id: string, data: Partial<ISlot>, session: any): Promise<ISlot | null> {
    return await this._model.findByIdAndUpdate(id, data, { new: true }).session(session);
  }
}
