/**
 * A listening game for tuning a guitar by ear: it plays the reference (the lower string at the 5th fret, the 4th on G)
 * and the next open string, a little out or in tune; the student says flat, sharp or in tune. Fewer cents is harder;
 * `together` rings both at once so the student learns to hear the beats. Listening only, no instrument or voice.
 * @component tuning-ears basic
 */
export interface TuningEarsProps {
  /** how far out the open string is when not in tune, in cents (3 to 50); default 20. 30 is easy, 10 hard, 5 very hard */
  cents?: number;
  /** ring the two notes together, to hear the beating of strings out of tune; default false: one after the other */
  together?: boolean;
}
