import mongoose from 'mongoose';

/** Normalize ObjectId, populated doc, or string to a string id. */
export function extractId(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (typeof value === 'object' && value !== null && '_id' in value) {
        const id = (value as { _id: unknown })._id;
        if (id instanceof mongoose.Types.ObjectId) return id.toString();
        if (typeof id === 'string') return id;
        if (id != null) return String(id);
    }
    return String(value);
}

export function isPopulatedDoc<T extends object>(value: unknown): value is T {
    return typeof value === 'object' && value !== null && !(value instanceof mongoose.Types.ObjectId);
}
