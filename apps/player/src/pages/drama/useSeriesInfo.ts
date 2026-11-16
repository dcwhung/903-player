import { useCallback, useMemo, useState } from 'react';
import type { DramaConfig, SeriesEpisode } from '@903-player/catalog';
import { arcInfoFor, arcLabelFor } from '../../catalog/dramas';
import { t } from '../../i18n/t';
import type { ArcSummary } from '../../selectors/arcProgress';
import {
    arcInfoSections,
    arcInlineInfo,
    seriesHasInfo,
    shouldAutoOpenArcInfo,
    type InlineInfo,
} from '../../selectors/itemInfo';

type ArcGroups = readonly { items: readonly ArcSummary[] }[];

/** 全集 sheet 開唔開、資料展開咗未（useSeriesSheet） */
interface SheetControls {
    setSheetOpen: (open: boolean) => void;
    infoExpanded: boolean;
    setInfoExpanded: (expanded: boolean) => void;
}

interface SeriesInfoOptions {
    groups: ArcGroups;
    /** 唱片區顯示嘅集：已揀短篇時 ⓘ 開佢個短篇 */
    upNext: SeriesEpisode | undefined;
    /** 未揀短篇（黑碟、「揀一個短篇開始收聽」） */
    empty: boolean;
    sheet: SheetControls;
    /** 原本嘅揀短篇（chip / 全集行） */
    pickArc: (arc: string) => void;
}

/** 某個短篇嘅行資料（聲演 / 簡介）：停用 / 唔識嘅短篇係空 */
const useArcInfoOf = (dramaId: string) =>
    useCallback((arc: string): InlineInfo => arcInlineInfo(arcInfoFor(dramaId, arc)), [dramaId]);

/** 全集 sheet 嘅劇集資料：成套劇有資料先有箭咀；「全集」掣開預設收合，ⓘ（未揀短篇）開就展開 */
const useSheetInfo = (
    drama: DramaConfig,
    summaries: readonly ArcSummary[],
    sheet: SheetControls,
) => {
    const arcInfoOf = useArcInfoOf(drama.id);
    const hasInfo = useMemo(
        () =>
            seriesHasInfo(
                drama,
                summaries.map((s) => arcInfoFor(drama.id, s.arc)),
            ),
        [drama, summaries],
    );
    const openAll = (expanded: boolean) => {
        sheet.setInfoExpanded(expanded);
        sheet.setSheetOpen(true);
    };
    const sheetInfo = hasInfo
        ? {
              expanded: sheet.infoExpanded,
              onToggle: () => sheet.setInfoExpanded(!sheet.infoExpanded),
              dramaSummary: drama.summary,
              arcInfoOf: (s: ArcSummary) => arcInfoOf(s.arc),
          }
        : undefined;
    return { hasInfo, sheetInfo, openAll };
};

/** 短篇獨立資料 sheet：揀未聽過（new）又有資料嘅短篇自動彈 */
const useArcInfoSheet = (
    drama: DramaConfig,
    summaries: readonly ArcSummary[],
    pickArc: (arc: string) => void,
) => {
    const [infoArc, setInfoArc] = useState<string | null>(null);
    const arcInfoOf = useArcInfoOf(drama.id);
    const sectionsOf = (arc: string) =>
        arcInfoSections(drama, arcLabelFor(drama.id, arc), arcInfoFor(drama.id, arc));
    return {
        sectionsOf,
        openArc: setInfoArc,
        infoSheet: {
            open: infoArc !== null,
            sections: infoArc === null ? [] : sectionsOf(infoArc),
            close: () => setInfoArc(null),
        },
        pickArc: (arc: string) => {
            pickArc(arc);
            const state = summaries.find((s) => s.arc === arc)?.state;
            if (shouldAutoOpenArcInfo(state, arcInfoOf(arc))) setInfoArc(arc);
        },
    };
};

/**
 * 短篇劇資料（P9.5 #12 第 3、5 點）：全集 sheet 箭咀 / 展開資料、唱片圈 ⓘ 分流
 *（未揀 = 全集 sheet 展開；已揀 = 唱片嗰集個短篇嘅獨立 sheet）、揀未聽過又有資料嘅短篇自動彈獨立 sheet
 */
export const useSeriesInfo = (drama: DramaConfig, options: SeriesInfoOptions) => {
    const { groups, upNext, empty, sheet } = options;
    const summaries = useMemo(() => groups.flatMap((g) => g.items), [groups]);
    const { hasInfo, sheetInfo, openAll } = useSheetInfo(drama, summaries, sheet);
    const arcSheet = useArcInfoSheet(drama, summaries, options.pickArc);
    const pickedArc = upNext?.arc;
    const canOpen = empty
        ? hasInfo
        : pickedArc !== undefined && arcSheet.sectionsOf(pickedArc).length > 0;
    const onInfo = () => (empty ? openAll(true) : arcSheet.openArc(pickedArc ?? null));
    return {
        sheetInfo,
        gaugeInfo: canOpen ? { onInfo, infoLabel: t('info.dramaInfo') } : undefined,
        infoSheet: arcSheet.infoSheet,
        /** 由「全集」掣開：資料預設收合 */
        openSheet: () => openAll(false),
        pickArc: arcSheet.pickArc,
    };
};

export type SeriesInfoView = ReturnType<typeof useSeriesInfo>;
