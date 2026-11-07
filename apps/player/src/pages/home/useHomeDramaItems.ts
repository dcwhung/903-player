import { useMemo } from 'react';
import { type DramaConfig, hkToday, releasedEpisodes } from '@903-player/catalog';
import type { DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaShelf';
import {
    arcAvailabilityOf,
    catalogEpisodesOf,
    enabledDramas,
    seriesEpisodesOf,
    upcomingDramas,
} from '../../catalog/dramas';
import { useAudioBusy } from '../../hooks/useAudioBusy';
import { useDramaContinue } from '../../hooks/useDramaContinue';
import { useDramaNewLabels } from '../../hooks/useDramaNewLabels';
import { useRefreshedOn } from '../../hooks/useRefreshedOn';
import { useStartDrama } from '../../hooks/useStartDrama';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { isEpisodeOfDrama, seriesArcs } from '../../selectors/dramas';
import { dramaShelfOrder } from '../../selectors/dramaShelf';
import { getProgressMap } from '../../services/progressStore';
import { zoomKey } from '../../utils/cardZoom';
import {
    leavingCorner,
    releaseNote,
    upcomingTile,
    withoutRepeatedLeaving,
} from './dramaTileNotices';
import { useTileOpen, type HomeRight } from './useTileOpen';

/**
 * 劇集格右下角：短篇劇集「N 個短篇」（分季嘅「全 N 季」；只數已上架未下架嘅），每日劇集「每日更新」；
 * 即將上架嘅字尾（H2 / E1）另外由 releaseNote 出（獨立一截，W-533）
 */
const dramaMeta = (drama: DramaConfig, today: string): string => {
    if (drama.kind !== 'series') return t('drama.daily');
    const count = seriesArcs(seriesEpisodesOf(drama.id, today)).length;
    return t(drama.arcUnit === 'season' ? 'drama.seasonCount' : 'drama.arcCount', { count });
};

/**
 * 劇集格嘅圖同字：右下角短篇數（+ 即將上架字尾）、左上角快將下架、繼續收聽條；
 * 繼續收聽嗰集同左上角同一日落架就淨係左上角講（withoutRepeatedLeaving）
 */
const tileText = (drama: DramaConfig, today: string, resume: DramaShelfItem['resume']) => {
    const arcs = arcAvailabilityOf(drama.id);
    const leaving = leavingCorner(drama, arcs, today);
    return {
        id: drama.id,
        name: drama.name,
        art: drama.tileArt,
        meta: dramaMeta(drama, today),
        leaving,
        release: releaseNote(arcs, today),
        resume: withoutRepeatedLeaving(resume, leaving?.date),
    };
};

/** 整套即將上架嘅劇：書架最尾灰格，撳唔到（一登記即刻出） */
const upcomingItems = (today: string): DramaShelfItem[] =>
    upcomingDramas(today).map((drama) => ({
        id: drama.id,
        name: drama.name,
        art: drama.tileArt,
        meta: '',
        upcoming: upcomingTile(drama, today),
        onOpen: () => undefined,
        onResume: () => undefined,
    }));

/**
 * 排位用 catalog 已上架嘅集數（包括已下架，同續聽一樣）：部分集數 / 短篇下架之後書架排位唔郁（W-531）
 */
const shelfEpisodesOf = (id: string, today: string) =>
    releasedEpisodes(catalogEpisodesOf(id), today);

/** 廣播劇 tab 嘅劇集次序（見 dramaShelfOrder）；轉集、有集數聽完就按新進度重新排 */
const useShelfDramas = (): DramaConfig[] => {
    const player = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, player.recording]);
    // 播放中主頁跟 currentTime 成日 re-render；progressMap 由 useRefreshedOn 出，reference 穩定，
    // 劇集清單只跟日子變，所以只係進度真係重新讀過（或者過咗午夜）先再排（S-481）
    // 上架 / 下架按香港日子：過咗午夜（today 變）都重新排
    const today = hkToday();
    return useMemo(
        () =>
            dramaShelfOrder(enabledDramas(today), (id) => shelfEpisodesOf(id, today), progressMap),
        [progressMap, today],
    );
};

/**
 * 廣播劇 tab 嘅劇集格：
 * - 撳格：入頁，過場按主頁右邊有乜揀（useTileOpen：expand / zoom 連把手 / zoom）。短篇劇集永遠唔播（用戶可能只係想睇清單）；每日劇集同節目格一樣，冇其他嘢佔住、亦未載入呢套劇先播
 * - 撳「繼續收聽」條：唔入頁，淨係播續聽嗰集（mini player 跟住顯示）；用戶明確要播，會蓋過其他嘢
 */
export const useDramaItems = (right: HomeRight): DramaShelfItem[] => {
    const open = useTileOpen(right);
    const startDrama = useStartDrama();
    const busy = useAudioBusy();
    const { recording } = usePlayer();
    const newLabels = useDramaNewLabels();
    const continueOf = useDramaContinue();
    const today = hkToday();
    const items = useShelfDramas().map((drama) => ({
        ...tileText(drama, today, continueOf(drama)),
        newLabel: newLabels.get(drama.id),
        onOpen: () => {
            // 已載入呢套劇就算 mini player 關咗都唔播，保持暫停（S-538）
            // 用實際有冇開到播（S-682）
            const starts =
                drama.kind === 'daily' &&
                !busy &&
                !isEpisodeOfDrama(recording, drama.id) &&
                startDrama(drama);
            const page = { kind: 'drama', dramaId: drama.id } as const;
            open({ key: zoomKey.drama(drama.id), path: `/drama/${drama.id}`, page, starts });
        },
        onResume: () => void startDrama(drama),
    }));
    return [...items, ...upcomingItems(today)];
};
