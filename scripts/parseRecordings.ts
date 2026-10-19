import { load, type CheerioAPI } from 'cheerio';
import { findShowByName } from '../src/config/shows';
import { isRecording } from '../src/data/recordingValidation';
import type { Recording, ShowId } from '../src/types/recording';

/** 檔名開頭：20261017_2308_ */
const DATE_TIME_PATTERN = /(\d{4})(\d{2})(\d{2})_(\d{4})_/;
/** 檔名入面嘅節目名：20261017_2308_公子會.aac → 公子會（任何副檔名） */
const FILENAME_SHOW_PATTERN = /^\d{8}_\d{4}_(.+)\.[a-z0-9]+$/i;
/** 下一頁連結只接受原站本身（https、同一個 host） */
const SITE_ORIGIN = 'https://hkfm903.live';
/** 分頁參數名，例如 ?page=2 */
const PAGE_PARAM = 'page';
/** 網址冇 page= 就當係第 1 頁 */
const FIRST_PAGE = 1;
const DECIMAL = 10;

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

/** 一頁或者多頁（分頁）HTML 嘅卡，按頁序合併 */
const readCards = (html: string | string[]): Card[] =>
    typeof html === 'string' ? readPageCards(html) : html.flatMap(readPageCards);

const readPageCards = (html: string): Card[] => {
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

/** 節目頁：原站已按節目篩選，再用 badge / 檔名交叉檢查；丟走嘅卡經 onDrop 報告 */
export const parseRecordings = (
    html: string | string[],
    showId: ShowId,
    onDrop: (title: string) => void = () => {},
): Recording[] =>
    readCards(html)
        .filter((card) => {
            const keep = belongsTo(card, showId);
            if (!keep) {
                onDrop(card.title);
            }
            return keep;
        })
        .map((card) => toRecording(card, showId))
        .filter(isPresent);

/** All Shows 頁：按 badge 同檔名分返落各個節目 */
export const parseAllRecordings = (html: string | string[]): ParsedAll => {
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

/**
 * 相對連結以目前網址為基準；只接受原站網址，其他（包括 http、子網域）一律唔跟。
 * #fragment 唔算另一頁，所以去走，否則 href="#" 會被當成新網址再爬多次。
 */
const toSiteUrl = (href: string | undefined, baseUrl: string): string | null => {
    if (!href) {
        return null;
    }
    try {
        const url = new URL(href, baseUrl);
        url.hash = '';
        return url.origin === SITE_ORIGIN ? url.href : null;
    } catch {
        return null;
    }
};

/** 同一個列表 = 同 path、除咗 page 之外 query 全部一樣（唔理次序），例如同一個 ?show= */
const listKey = (url: string): string => {
    const { pathname, searchParams } = new URL(url);
    const params = new URLSearchParams(searchParams);
    params.delete(PAGE_PARAM);
    params.sort();
    return `${pathname}?${params.toString()}`;
};

/**
 * 下一頁候選：要係原站網址、同一個列表（唔可以跳去其他節目），
 * 而且唔係目前呢頁（例如 href="#" 或者自己連返自己）。
 */
const toNextUrl = (href: string | undefined, currentUrl: string): string | null => {
    const url = toSiteUrl(href, currentUrl);
    const current = toSiteUrl(currentUrl, currentUrl);
    if (url === null || current === null || url === current) {
        return null;
    }
    return listKey(url) === listKey(current) ? url : null;
};

const pageNumberOf = (url: string): number => {
    const value = Number.parseInt(new URL(url).searchParams.get(PAGE_PARAM) ?? '', DECIMAL);
    return Number.isNaN(value) ? FIRST_PAGE : value;
};

/** 模式 1：<a rel="next"> */
const relNextHref = ($: CheerioAPI): string | undefined => $('a[rel~="next"]').first().attr('href');

/** 模式 2：.pagination 入面 active 嗰項之後嘅連結（Bootstrap 嘅 li.active 或者 a.active） */
const afterActiveHref = ($: CheerioAPI): string | undefined => {
    const next = $('.pagination .active').first().next();
    return next.is('a') ? next.attr('href') : next.find('a').first().attr('href');
};

/** 模式 3：href 有 page= 而頁數大過目前頁，揀最細嗰個（即係下一頁） */
const higherPageUrl = ($: CheerioAPI, currentUrl: string): string | null => {
    const current = pageNumberOf(currentUrl);
    const candidates = $(`a[href*="${PAGE_PARAM}="]`)
        .toArray()
        .map((link) => toNextUrl($(link).attr('href'), currentUrl))
        .filter((url): url is string => url !== null && pageNumberOf(url) > current)
        .sort((a, b) => pageNumberOf(a) - pageNumberOf(b));
    return candidates[0] ?? null;
};

/** 原站有冇分頁未知，所以逐個常見模式試；冇就回傳 null（即係得一頁） */
export const readNextPageUrl = (html: string, currentUrl: string): string | null => {
    const $ = load(html);
    return (
        toNextUrl(relNextHref($), currentUrl) ??
        toNextUrl(afterActiveHref($), currentUrl) ??
        higherPageUrl($, currentUrl)
    );
};
