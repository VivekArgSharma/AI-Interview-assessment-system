/**
 * Audio processing utilities for in-browser high-definition voice recording,
 * noise suppression, peak normalization, and PCM WAV encoding.
 * Guarantees zero ffmpeg dependency and optimal input for Whisper STT and VAD.
 */

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples clamped to [-32768, 32767]
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * High-definition audio conversion:
 * 1. Resamples to 16kHz mono (Whisper requirement).
 * 2. Applies an 80Hz high-pass filter to eliminate desk hum and low-end air turbulence.
 * 3. Dynamic peak normalization to ensure quiet speech is clearly heard by Whisper.
 */
export async function convertBlobToWav(blob: Blob, targetSampleRate: number = 16000): Promise<Blob> {
  if (!blob || blob.size === 0) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('AudioContext not supported in this browser, using original blob.');
      return blob;
    }

    const audioContext = new AudioContextClass();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Resample and mix down to mono at targetSampleRate (16000Hz)
    const numTargetSamples = Math.max(1, Math.round(audioBuffer.duration * targetSampleRate));
    const offlineCtx = new OfflineAudioContext(1, numTargetSamples, targetSampleRate);

    // High-pass filter at 80Hz to strip rumble & microphone pops
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 80;

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    source.connect(highpass);
    highpass.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const monoSamples = renderedBuffer.getChannelData(0);

    // Dynamic AGC Peak Normalization: brings speech into optimal -3dBFS window
    let maxAmp = 0;
    for (let i = 0; i < monoSamples.length; i++) {
      const abs = Math.abs(monoSamples[i]);
      if (abs > maxAmp) maxAmp = abs;
    }

    if (maxAmp > 0.005 && maxAmp < 0.65) {
      const gain = 0.88 / maxAmp;
      for (let i = 0; i < monoSamples.length; i++) {
        monoSamples[i] = Math.max(-1, Math.min(1, monoSamples[i] * gain));
      }
    }

    try {
      await audioContext.close();
    } catch {}

    return encodeWav(monoSamples, targetSampleRate);
  } catch (err) {
    console.warn('Error converting audio to WAV in browser, falling back to original blob:', err);
    return blob;
  }
}

/**
 * Returns optimized media stream constraints with acoustic echo cancellation,
 * noise suppression, and auto gain control enabled for clear voice pickup.
 */
export async function getStudioMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone audio recording is not supported in this browser environment.');
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}
