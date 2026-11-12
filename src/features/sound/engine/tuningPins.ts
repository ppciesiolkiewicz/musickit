/**
 * Sample tunings set by hand, for files `npm run samples:measure` cannot measure reliably (a wobbly note, a harmonic louder than
 * the note): cents + sharp of A440, keyed by instrument id and the sample's MIDI note. They win over the measured value. Set one
 * by listening to the sample against the tuner's exact reference, and say in a comment why.
 */
export const TUNING_PINS: Record<string, Record<number, number>> = {};
