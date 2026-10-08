/**
 * AudioWorklet that forwards every block of input audio to the main thread together with its
 * position on the audio context timeline. Loaded from a Blob URL so no extra file has to be served.
 */
export const RECORDER_PROCESSOR_NAME = "looper-recorder";

const SOURCE = `
class LooperRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0].length > 0) {
      const l = new Float32Array(input[0]);
      const r = new Float32Array(input.length > 1 ? input[1] : input[0]);
      this.port.postMessage({ frame: currentFrame, l, r }, [l.buffer, r.buffer]);
    }
    return true;
  }
}
registerProcessor("${RECORDER_PROCESSOR_NAME}", LooperRecorder);
`;

export function recorderWorkletUrl(): string {
  return URL.createObjectURL(new Blob([SOURCE], { type: "application/javascript" }));
}
