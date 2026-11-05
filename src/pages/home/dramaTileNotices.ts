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

/** 「3 個短篇」後面加最快上架嗰個新短篇 / 新一批集數；冇就照舊 */
export const withReleaseSuffix = (
    meta: string,
    arcs: readonly ArcAvailability[],
    today: string,
): string => {
    const next = nextRelease(arcs, today);
    if (!next) return meta;
    const key = next.kind === 'arc' ? 'availability.tileNewArc' : 'availability.tileNewEpisodes';
    return t(key, { meta, when: releaseWhen(next.date, today, 'short') });
};

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

export const leavingCorner = (
    drama: DateWindow,
    arcs: readonly ArcAvailability[],
    today: string,
): TileNotice | undefined => {
    const leaving = dramaLeaving(drama, arcs, today);
    if (!leaving) return undefined;
    const key = LEAVING_KEYS[leaving.scope];
    return {
        text: t(key, { when: removalWhen(leaving.date, today, 'short') }),
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
