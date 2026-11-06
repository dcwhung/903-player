import type { ReactNode } from 'react';
import { ArcPicker } from '../../components/pages/drama/ArcPicker/ArcPicker';
import { ArcSheet } from '../../components/pages/drama/ArcSheet/ArcSheet';
import { EpisodeList } from '../../components/shared/player/EpisodeList/EpisodeList';
import { dramaArtFor } from '../../catalog/dramas';
import { usePlayer } from '../../player/usePlayer';
import type { ArcSummary } from '../../selectors/arcProgress';
import { DramaHeader } from './DramaHeader';
import page from '../shared/Page.module.css';
import type { SeriesDramaView } from './useDramaPage';

/**
 * 全集表每行碟面：同唱片一樣用 dramaArtFor（短篇有自己碟面就用，冇就劇集主碟面），
 * 拎嗰個短篇任何一集都得，resume 一定有
 */
const arcCover = (summary: ArcSummary): string => dramaArtFor(summary.resume);

interface SeriesArcSheetProps {
    sheet: SeriesDramaView['sheet'];
    current: SeriesDramaView['current'];
    docked: boolean;
}

/** 全集表：橫版 docked 喺左欄 listBody 入面，直版喺 <main> 尾（兩個位置用同一套 props） */
export const SeriesArcSheet = ({ sheet, current, docked }: SeriesArcSheetProps) => {
    const { isPlaying, recording } = usePlayer();
    return (
        <ArcSheet
            open={sheet.open}
            docked={docked}
            groups={sheet.groups}
            current={recording === current ? current : undefined}
            isPlaying={isPlaying}
            upcoming={sheet.upcoming}
            notice={sheet.notice}
            notesOf={sheet.notesOf}
            onPick={sheet.pick}
            onPlay={sheet.play}
            onClose={sheet.close}
            coverOf={arcCover}
        />
    );
};

/** 短篇劇集嘅集數清單：行名用集名，照集數次序，入頁捲到播緊嗰集（頂、露半行上一集） */
const SERIES_LIST = { labels: 'title', scrollAlign: 'top' } as const;

type SeriesListView = Pick<
    SeriesDramaView,
    | 'current'
    | 'start'
    | 'arcs'
    | 'upcomingArcs'
    | 'notice'
    | 'noticeTag'
    | 'status'
    | 'arc'
    | 'pickArc'
    | 'items'
    | 'pressEpisode'
    | 'sheet'
>;

/**
 * 成套劇快將下架：未開始聽取代「揀一個短篇開始收聽」；聽緊就出喺「全集」chip（標籤行唔加字）
 */
const pickerNotice = ({ notice, noticeTag, status }: SeriesListView) =>
    notice && noticeTag
        ? { text: notice.text, ...noticeTag, replace: status === 'unloaded' }
        : undefined;

interface SeriesListColumnProps {
    view: SeriesListView;
    title: string;
    landscape: boolean;
    /** 短篇 chips 上面嗰行 */
    label: string;
    /** 讀屏版 label（「，」分隔，S-735） */
    spokenLabel: string;
    /** 橫版 docked 全集表（直版係 false，全集表喺 <main> 尾） */
    dockedSheet: ReactNode;
    /** 由「我的收藏」撳入嚟嗰集（捲過去、highlight） */
    focusKey?: string | undefined;
}

/** 橫版左欄 / 直版唱片下面：頁頭（橫版）+ 短篇 chips + 集數清單；橫版全集表只蓋呢欄 */
export const SeriesListColumn = ({
    view,
    title,
    landscape,
    label,
    spokenLabel,
    dockedSheet,
    focusKey,
}: SeriesListColumnProps) => (
    <div className={page.listColumn}>
        {landscape && <DramaHeader title={title} />}
        <div className={page.listBody}>
            {/* 橫版全集表蓋住 chips + 清單：下面嗰啲 inert，Tab / 讀屏唔會入到睇唔見嘅嘢 */}
            <div className={page.listContent} inert={landscape && view.sheet.open}>
                <ArcPicker
                    arcs={view.arcs}
                    upcoming={view.upcomingArcs}
                    notice={pickerNotice(view)}
                    selected={view.arc}
                    playing={view.start ? undefined : view.current?.arc}
                    label={label}
                    spokenLabel={spokenLabel}
                    onPick={view.pickArc}
                    onOpenAll={view.sheet.openSheet}
                />
                <EpisodeList
                    items={view.items}
                    onSelect={view.pressEpisode}
                    focusKey={focusKey}
                    {...SERIES_LIST}
                />
            </div>
            {dockedSheet}
        </div>
    </div>
);
