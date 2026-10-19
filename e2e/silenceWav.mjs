// 產生 8kHz 8-bit 單聲道靜音 WAV（模擬錄音檔）
const SAMPLE_RATE = 8000;
const HEADER_BYTES = 44;
const SILENCE = 128;

export const silenceWav = (seconds) => {
    const samples = SAMPLE_RATE * seconds;
    const buf = Buffer.alloc(HEADER_BYTES + samples, SILENCE);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(HEADER_BYTES - 8 + samples, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(SAMPLE_RATE, 24);
    buf.writeUInt32LE(SAMPLE_RATE, 28);
    buf.writeUInt16LE(1, 32);
    buf.writeUInt16LE(8, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(samples, 40);
    return buf;
};
