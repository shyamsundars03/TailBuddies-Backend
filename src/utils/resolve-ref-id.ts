import mongoose from 'mongoose';

/** Normalize populated or raw Mongo refs to a string id. */
export function resolveRefId(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (typeof value === 'object' && value !== null && '_id' in value) {
        const id = (value as { _id: unknown })._id;
        if (id instanceof mongoose.Types.ObjectId) return id.toString();
        if (typeof id === 'string') return id;
    }
    return String(value);
}
