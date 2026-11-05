/*
 * 主頁劇集格嘅上架 / 下架字（P8 #6，_mockups_/coming-soon ① ⑥ ⑦ ⑧）：
 * 右下角字尾（H2「· 新短篇 12/11 上架」、E1「· 全新集數 19/11 上架」）、
 * 左上角琥珀「⏳ 05/12 下架」、書架最尾新劇灰格「⏱ 即將上架 · 01/12」
 */
import { t, type MessageKey } from '../../i18n/t';
import {
    dramaLeaving,
    nextRelease,
    type DateWindow,
    type LeavingScope,
} from '../../selectors/availability';
import {
    dayWhen,
    releaseDateLong,
    releaseWhen,
    removalDateLong,
    removalWhen,
} from '../../selectors/availabilityLabels';
import type { ArcAvailability } from '../../types/drama';

const LEAVING_KEYS = {
    drama: 'availability.leavingDrama',
    arc: 'availability.leavingArcs',
    episodes: 'availability.leavingEpisodes',
} as const satisfies Record<LeavingScope, MessageKey>;

/** 格上面嘅字（text）同讀屏句（label，長版日子） */
export interface TileNotice {
    text: string;
    label: string;
}

/** 格窄時改出嘅短版（tag，例如「05/12」/「後日上架」） */
export type TileNoticeWithTag = TileNotice & { tag: string };

/**
 * 短篇數後面嘅字尾（H2 新短篇 / E1 全新集數）：最快上架嗰個；冇就 undefined。
 * 獨立一截，格窄時短篇數先收尾（W-533）；讀屏名用長版日子（S-700）
 */
export const releaseNote = (
    arcs: readonly ArcAvailability[],
    today: string,
): TileNoticeWithTag | undefined => {
    const next = nextRelease(arcs, today);
    if (!next) return undefined;
    const key = next.kind === 'arc' ? 'availability.tileNewArc' : 'availability.tileNewEpisodes';
    const when = releaseWhen(next.date, today, 'short');
    return {
        text: t(key, { when }),
        tag: when,
        label: t(key, { when: releaseDateLong(next.date) }),
    };
};

export const leavingCorner = (
    drama: DateWindow,
    arcs: readonly ArcAvailability[],
    today: string,
): TileNoticeWithTag | undefined => {
    const leaving = dramaLeaving(drama, arcs, today);
    if (!leaving) return undefined;
    const key = LEAVING_KEYS[leaving.scope];
    return {
        text: t(key, { when: removalWhen(leaving.date, today, 'short') }),
        tag: dayWhen(leaving.date, today),
        label: t(key, { when: removalDateLong(leaving.date) }),
    };
};

/** 即將上架嘅整套新劇：灰格底部深色條（text）同讀屏句（label） */
export const upcomingTile = (
    drama: { name: string; launchedAt?: string | undefined },
    today: string,
): TileNotice => {
    const date = drama.launchedAt ?? today;
    return {
        text: t('availability.upcomingDrama', { when: dayWhen(date, today) }),
        label: t('availability.unavailableLabel', {
            name: drama.name,
            when: releaseDateLong(date),
        }),
    };
};
