import { RECORDINGS_DATA_PATH } from '../config/constants';
import { SHOWS } from '../config/shows';
import type { Recording } from '../types/recording';

const ALLOWED_AUDIO_ORIGIN = 'https://audio.hkfm903.live';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{4}$/;
const SHOW_IDS = new Set<string>(SHOWS.map((show) => show.id));

const hasAllowedOrigin = (url: string): boolean => {
    try {
        return new URL(url).origin === ALLOWED_AUDIO_ORIGIN;
    } catch {
        return false;
    }
};

const isRecording = (value: unknown): value is Recording => {
    const r = value as Recording;
    return (
        typeof r === 'object' &&
        r !== null &&
        SHOW_IDS.has(r.showId) &&
        DATE_PATTERN.test(r.date) &&
        TIME_PATTERN.test(r.time) &&
        typeof r.url === 'string' &&
        hasAllowedOrigin(r.url)
    );
};

export const fetchRecordings = async (fetchImpl: typeof fetch = fetch): Promise<Recording[]> => {
    const response = await fetchImpl(`${import.meta.env.BASE_URL}${RECORDINGS_DATA_PATH}`, {
        cache: 'no-cache',
    });
    if (!response.ok) {
        throw new Error(`Failed to load recordings: ${response.status}`);
    }
    const payload = (await response.json()) as { recordings?: unknown };
    if (!Array.isArray(payload.recordings)) {
        throw new Error('Invalid recordings payload');
    }
    return payload.recordings.filter(isRecording);
};
