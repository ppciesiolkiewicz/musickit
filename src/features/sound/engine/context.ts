let audioContext: AudioContext | null = null;

/** The one AudioContext of the whole app. */
export function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

let outputBus: GainNode | null = null;

/**
 * The app's main output: players send their sound here by default, on its way to the speakers.
 * Other features (the looper) can tap it to record what is played.
 */
export function getOutputBus(): GainNode {
  const ctx = getAudioContext();
  if (!outputBus) {
    outputBus = ctx.createGain();
    outputBus.connect(ctx.destination);
  }
  return outputBus;
}
