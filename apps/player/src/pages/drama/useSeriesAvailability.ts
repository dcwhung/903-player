import { useMemo } from 'react';
import {
    type ArcAvailability,
    type DramaConfig,
    hkToday,
    pendingBatches,
    type SeriesEpisode,
} from '@903-player/catalog';
import type { ArcChip } from '../../components/pages/drama/ArcPicker/ArcPicker';
import type { EpisodeItem } from '../../components/shared/player/EpisodeList/EpisodeList';
import { arcAvailabilityOf, dramaArtFor } from '../../catalog/dramas';
import type { ArcSummary } from '../../selectors/arcProgress';
import { episodesInArc } from '../../selectors/dramas';
import {
    arcNotesOf,
    batchItemsOf,
    chipLeavingOf,
    dramaNoticeOf,
    episodeLeavingOf,
    upcomingChipsOf,
    upcomingRowsOf,
} from './seriesAvailability';

/** 短篇碟面（冇就劇集碟面）：即將上架嘅短篇未有集數，用短篇名搵（假集數，id / url 唔會用到） */
const arcCover = (dramaId: string, arc: string): string =>
    dramaArtFor({ kind: 'series', dramaId, id: '', url: '', arc, no: 0 });

/** 短篇已上架最後一集（「聽到第 N 集」用） */
const lastNoOf = (episodes: readonly SeriesEpisode[], arc: string): number =>
    episodesInArc(episodes, arc).at(-1)?.no ?? 0;

/** 清單：每集加快將下架（LE1），尾加未上架批次（摺埋，一批一行） */
const listWithAvailability = (
    info: ArcAvailability | undefined,
    items: readonly EpisodeItem[],
    shown: readonly SeriesEpisode[],
    today: string,
): EpisodeItem[] => {
    if (!info) return [...items];
    const withLeaving = items.map((item, i) => {
        const no = shown[i]?.no;
        return no === undefined ? item : { ...item, leaving: episodeLeavingOf(info, no, today) };
    });
    return [...withLeaving, ...batchItemsOf(info, today)];
};

/** 按短篇名搵：chip 琥珀小標（LK1）、一覽表行補充（A2 / LS2） */
const arcLookups = (
    infoOf: (arc: string) => ArcAvailability | undefined,
    episodes: readonly SeriesEpisode[],
    { today, dramaRemovedAt }: { today: string; dramaRemovedAt: string | undefined },
) => ({
    withChipLeaving: (chip: ArcChip): ArcChip => {
        const info = infoOf(chip.arc);
        return info ? { ...chip, leaving: chipLeavingOf(info, today, dramaRemovedAt) } : chip;
    },
    notesOf: (s: ArcSummary) => {
        const info = infoOf(s.arc);
        return info && arcNotesOf(info, s, lastNoOf(episodes, s.arc), today);
    },
});

/**
 * 短篇劇集頁嘅即將上架 / 快將下架（P8 #6，_mockups_/coming-soon）：
 * 每次 render 重新攞今日（過咗香港午夜自動轉）；catalog 資料按劇集 memo
 */
export const useSeriesAvailability = (drama: DramaConfig, episodes: readonly SeriesEpisode[]) => {
    const today = hkToday();
    const arcs = useMemo(() => arcAvailabilityOf(drama.id), [drama]);
    const byArc = useMemo(() => new Map(arcs.map((a) => [a.arc, a] as const)), [arcs]);
    const infoOf = (arc: string): ArcAvailability | undefined => byArc.get(arc);
    // 仲有下一批未上架嘅短篇；按日子 memo，一覽表分組先唔會每次 render 重計
    const pending = useMemo(
        () => new Set(arcs.filter((a) => pendingBatches(a, today).length > 0).map((a) => a.arc)),
        [arcs, today],
    );
    const notice = dramaNoticeOf(drama, today);
    return {
        pending,
        notice,
        upcomingChips: upcomingChipsOf(arcs, today),
        upcomingRows: upcomingRowsOf(arcs, today, (arc) => arcCover(drama.id, arc)),
        ...arcLookups(infoOf, episodes, { today, dramaRemovedAt: drama.removedAt }),
        listItems: (
            arc: string | undefined,
            items: EpisodeItem[],
            shown: readonly SeriesEpisode[],
        ) => listWithAvailability(arc === undefined ? undefined : infoOf(arc), items, shown, today),
    };
};

export type SeriesAvailabilityView = ReturnType<typeof useSeriesAvailability>;
