import { load } from 'cheerio';
import { findShowByName } from '../src/config/shows';
import { isRecording } from '../src/data/recordingValidation';
import type { Recording, ShowId } from '../src/types/recording';

/** 檔名開頭：20261017_2308_ */
const DATE_TIME_PATTERN = /(\d{4})(\d{2})(\d{2})_(\d{4})_/;
/** 檔名入面嘅節目名：20261017_2308_公子會.aac → 公子會（任何副檔名） */
const FILENAME_SHOW_PATTERN = /^\d{8}_\d{4}_(.+)\.[a-z0-9]+$/i;

interface Card {
    /** 卡上所有 badge 文字（可能有「新」之類嘅標籤） */
    labels: string[];
    title: string;
    url: string;
}

export interface ParsedAll {
    recordings: Recording[];
    /** 原站有、但 app 冇列出嘅節目名 */
    unmatched: string[];
    /** badge 同檔名指向唔同節目而被丟棄嘅檔名 */
    conflicts: string[];
}

const readCards = (html: string): Card[] => {
    const $ = load(html);
    return $('.recording-card')
        .toArray()
        .map((card) => ({
            labels: $(card)
                .find('.badge')
                .toArray()
                .map((badge) => $(badge).text().trim())
                .filter(Boolean),
            title: $(card).find('.card-title').text().trim(),
            url: $(card).find('audio source').attr('src') ?? '',
        }));
};

const toRecording = ({ title, url }: Card, showId: ShowId): Recording | null => {
    const match = DATE_TIME_PATTERN.exec(title);
    if (!match) {
        return null;
    }
    const [, year, month, day, time] = match;
    const recording = { showId, date: `${year}-${month}-${day}`, time: time ?? '', url };
    return isRecording(recording) ? recording : null;
};

const isPresent = (recording: Recording | null): recording is Recording => recording !== null;

type Resolution = { showId: ShowId } | { unmatched: string } | { conflict: true };

/** badge 同檔名都揀出節目；全部指向同一個先接受 */
const resolveShow = (card: Card): Resolution => {
    const candidates = [...card.labels, FILENAME_SHOW_PATTERN.exec(card.title)?.[1] ?? ''];
    const ids = new Set(candidates.map((name) => findShowByName(name)?.id).filter(Boolean));
    if (ids.size > 1) {
        return { conflict: true };
    }
    const [showId] = [...ids];
    // 報節目名（檔名優先），唔好報「新」之類嘅標籤
    const filenameShow = FILENAME_SHOW_PATTERN.exec(card.title)?.[1];
    return showId ? { showId } : { unmatched: filenameShow || (card.labels.at(-1) ?? '') };
};

/** 節目頁嘅卡：認得出係其他節目（或者自相矛盾）就丟走，認唔出就信原站篩選 */
const belongsTo = (card: Card, showId: ShowId): boolean => {
    const resolution = resolveShow(card);
    if ('conflict' in resolution) {
        return false;
    }
    return 'showId' in resolution ? resolution.showId === showId : true;
};

/** 節目頁：原站已按節目篩選，再用 badge / 檔名交叉檢查 */
export const parseRecordings = (html: string, showId: ShowId): Recording[] =>
    readCards(html)
        .filter((card) => belongsTo(card, showId))
        .map((card) => toRecording(card, showId))
        .filter(isPresent);

/** All Shows 頁：按 badge 同檔名分返落各個節目 */
export const parseAllRecordings = (html: string): ParsedAll => {
    const result: ParsedAll = { recordings: [], unmatched: [], conflicts: [] };
    for (const card of readCards(html)) {
        const resolution = resolveShow(card);
        if ('conflict' in resolution) {
            result.conflicts.push(card.title);
        } else if ('unmatched' in resolution) {
            result.unmatched.push(resolution.unmatched);
        } else {
            const recording = toRecording(card, resolution.showId);
            if (recording) result.recordings.push(recording);
        }
    }
    return { ...result, unmatched: [...new Set(result.unmatched.filter(Boolean))] };
};
