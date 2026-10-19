import { load } from 'cheerio';
import { findShowByName } from '../src/config/shows';
import { isRecording } from '../src/data/recordingValidation';
import type { Recording, ShowId } from '../src/types/recording';

/** 檔名格式：20261017_2308_公子會.aac */
const FILENAME_PATTERN = /(\d{4})(\d{2})(\d{2})_(\d{4})_(.+?)\.aac/;
const FILENAME_SHOW_GROUP = 5;

interface Card {
    /** badge 上嘅節目名（可能冇） */
    label: string;
    title: string;
    url: string;
}

export interface ParsedAll {
    recordings: Recording[];
    /** 原站有、但 app 冇列出嘅節目名 */
    unmatched: string[];
}

const readCards = (html: string): Card[] => {
    const $ = load(html);
    return $('.recording-card')
        .toArray()
        .map((card) => ({
            label: $(card).find('.badge').first().text().trim(),
            title: $(card).find('.card-title').text().trim(),
            url: $(card).find('audio source').attr('src') ?? '',
        }));
};

const toRecording = ({ title, url }: Card, showId: ShowId): Recording | null => {
    const match = FILENAME_PATTERN.exec(title);
    if (!match) {
        return null;
    }
    const [, year, month, day, time] = match;
    const recording = { showId, date: `${year}-${month}-${day}`, time: time ?? '', url };
    return isRecording(recording) ? recording : null;
};

const isPresent = (recording: Recording | null): recording is Recording => recording !== null;

/** 節目頁：全部卡都屬於指定節目 */
export const parseRecordings = (html: string, showId: ShowId): Recording[] =>
    readCards(html)
        .map((card) => toRecording(card, showId))
        .filter(isPresent);

const showLabelOf = (card: Card): string =>
    card.label || (FILENAME_PATTERN.exec(card.title)?.[FILENAME_SHOW_GROUP] ?? '');

/** All Shows 頁：按 badge（冇就用檔名）分返落各個節目 */
export const parseAllRecordings = (html: string): ParsedAll => {
    const recordings: Recording[] = [];
    const unmatched = new Set<string>();
    for (const card of readCards(html)) {
        const label = showLabelOf(card);
        const show = findShowByName(label);
        const recording = show ? toRecording(card, show.id) : null;
        if (recording) {
            recordings.push(recording);
        } else if (!show && label) {
            unmatched.add(label);
        }
    }
    return { recordings, unmatched: [...unmatched] };
};
