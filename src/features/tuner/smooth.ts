/**
 * Steadies a stream of detected frequencies: the median of the last few (one bad frame does not throw the needle), then a moving
 * average in cents, so a held note settles instead of jittering. A jump of more than `jump` cents held for two readings is a new note
 * and starts over; a single stray reading (an octave error) is ignored.
 * Pure.
 */
export function createSmoother({ window = 5, alpha = 0.25, jump = 60 } = {}) {
  const recent: number[] = [];
  let avg: number | null = null; // in cents above 1 Hz, log2 scale
  let far = 0;
  return {
    push(hz: number): number {
      const raw = 1200 * Math.log2(hz);
      // a new note: forget the old one's readings
      if (avg !== null && Math.abs(raw - avg) > jump) {
        if (++far < 2) return 2 ** (avg / 1200);
        avg = null;
      }
      far = 0;
      if (avg === null) {
        recent.length = 0;
        avg = raw;
      }
      recent.push(hz);
      if (recent.length > window) recent.shift();
      const med = [...recent].sort((x, y) => x - y)[Math.floor(recent.length / 2)];
      avg += alpha * (1200 * Math.log2(med) - avg);
      return 2 ** (avg / 1200);
    },
    reset(): void {
      recent.length = 0;
      avg = null;
      far = 0;
    },
  };
}
