import { Slot, ISlot } from '../models/slot.model';
import { BaseRepository } from './base/base.repository';
import { ISlotRepository } from './interfaces/ISlotRepository';

export class SlotRepository extends BaseRepository<ISlot> implements ISlotRepository {
  constructor() {
    super(Slot);
  }
}
