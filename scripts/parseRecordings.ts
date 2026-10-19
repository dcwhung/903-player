import { load } from 'cheerio';
import { hasAllowedAudioOrigin, isRecording } from '../src/data/recordingValidation';
import type { Recording, ShowId } from '../src/types/recording';

/** 檔名格式：20261017_2308_公子會.aac */
const FILENAME_PATTERN = /(\d{4})(\d{2})(\d{2})_(\d{4})_/;

const toRecording = (title: string, url: string, showId: ShowId): Recording | null => {
    const match = FILENAME_PATTERN.exec(title);
    if (!match || !hasAllowedAudioOrigin(url)) {
        return null;
    }
    const [, year, month, day, time] = match;
    return { showId, date: `${year}-${month}-${day}`, time: time ?? '', url };
};

export const parseRecordings = (html: string, showId: ShowId): Recording[] => {
    const $ = load(html);
    return $('.recording-card')
        .toArray()
        .map((card) => {
            const title = $(card).find('.card-title').text();
            const url = $(card).find('audio source').attr('src') ?? '';
            return toRecording(title, url, showId);
        })
        .filter(isRecording);
};
