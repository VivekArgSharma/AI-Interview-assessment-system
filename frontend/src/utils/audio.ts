/**
 * Audio processing utilities for in-browser PCM WAV encoding and decoding.
 * Converts browser-recorded WebM/Opus audio to standard 16kHz mono 16-bit PCM WAV.
 * This guarantees zero external ffmpeg requirements on the backend.
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

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const monoSamples = renderedBuffer.getChannelData(0);

    // Peak-normalize quiet microphone audio so speech signal is clear and distinct
    let maxAmp = 0;
    for (let i = 0; i < monoSamples.length; i++) {
      const abs = Math.abs(monoSamples[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    if (maxAmp > 0.005 && maxAmp < 0.50) {
      const gain = 0.85 / maxAmp;
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
