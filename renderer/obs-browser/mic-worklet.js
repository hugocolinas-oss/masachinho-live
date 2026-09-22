// Process real PCM locally; only RMS numbers leave this worklet.
class RMSProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.sum = 0; this.count = 0; }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input) {
      for (const sample of input) this.sum += sample * sample;
      this.count += input.length;
      if (this.count >= sampleRate / 20) {
        this.port.postMessage(Math.sqrt(this.sum / this.count));
        this.sum = 0; this.count = 0;
      }
    }
    // No microphone monitoring or feedback: all output samples are zero.
    for (const output of outputs) for (const channel of output) channel.fill(0);
    return true;
  }
}
registerProcessor('rms-processor', RMSProcessor);
