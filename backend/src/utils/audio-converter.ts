const MULAW_MAX = 0x1fff;
const MULAW_BIAS = 33;
const SIGN_BIT = 0x80;
const INITIAL_EXPONENT = 7;
const INITIAL_EXP_MASK = 0x4000;
const MANTISSA_SHIFT_OFFSET = 3;
const MANTISSA_MASK = 0x0f;
const EXPONENT_SHIFT = 4;
const BYTE_MASK = 0xff;
const BYTES_PER_SAMPLE = 2;
const DOWNSAMPLE_FACTOR = 2;

function linearToMulaw(sample: number): number {
  const sign = sample < 0 ? SIGN_BIT : 0;
  if (sample < 0) sample = -sample;
  if (sample > MULAW_MAX) sample = MULAW_MAX;

  sample += MULAW_BIAS;

  let exponent = INITIAL_EXPONENT;
  let expMask = INITIAL_EXP_MASK;
  while ((sample & expMask) === 0 && exponent > 0) {
    exponent--;
    expMask >>= 1;
  }

  const mantissa =
    (sample >> (exponent + MANTISSA_SHIFT_OFFSET)) & MANTISSA_MASK;
  return ~(sign | (exponent << EXPONENT_SHIFT) | mantissa) & BYTE_MASK;
}

export function pcm16kToMulaw8k(pcmBase64: string): string {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const sampleCount = pcmBuffer.length / BYTES_PER_SAMPLE;
  const downsampledCount = Math.floor(sampleCount / DOWNSAMPLE_FACTOR);
  const mulawBuffer = Buffer.alloc(downsampledCount);
  const bytesPerDownsample = BYTES_PER_SAMPLE * DOWNSAMPLE_FACTOR;

  for (let i = 0; i < downsampledCount; i++) {
    const sample = pcmBuffer.readInt16LE(i * bytesPerDownsample);
    mulawBuffer[i] = linearToMulaw(sample);
  }

  return mulawBuffer.toString("base64");
}
