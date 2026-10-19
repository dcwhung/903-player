import { RECORDINGS_DATA_PATH } from '../config/constants';
import type { Recording } from '../types/recording';
import { isRecording, uniqueByUrl } from './recordingValidation';

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
    return uniqueByUrl(payload.recordings.filter(isRecording));
};
