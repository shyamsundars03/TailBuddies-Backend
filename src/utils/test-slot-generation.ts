const { rrulestr, RRule } = require('rrule');

function generateSlots(startTimeStr: string, endTimeStr: string, duration: number, buffer: number) {
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    let currentTotalMinutes = startH * 60 + startM;
    const endTotalMinutesLimit = endH * 60 + endM;
    const cycleTime = duration + buffer;

    const slots = [];
    while (currentTotalMinutes <= endTotalMinutesLimit) {
        const h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
        const m = (currentTotalMinutes % 60).toString().padStart(2, '0');
        const startTime = `${h}:${m}`;

        const nextTotalMinutes = currentTotalMinutes + duration;
        const nextH = Math.floor(nextTotalMinutes / 60).toString().padStart(2, '0');
        const nextM = (nextTotalMinutes % 60).toString().padStart(2, '0');
        const endTime = `${nextH}:${nextM}`;

        slots.push({ startTime, endTime });
        currentTotalMinutes += cycleTime;
    }
    return slots;
}



function isDateInRange(requestedDate: any, start: any, end: any) {
    const r = new Date(requestedDate).setHours(0, 0, 0, 0);
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
    return r >= s && r <= e;
}
