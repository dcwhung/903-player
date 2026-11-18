import type { ComponentProps, ReactNode } from 'react';
import { ListButton } from '../../components/shared/common/ListSheet/ListButton';
import { ListSheet } from '../../components/shared/common/ListSheet/ListSheet';
import { PageHeaderActions } from '../../components/shared/common/PageHeader/PageHeaderActions';
import {
    EpisodeList,
    episodeCount,
    episodeCountText,
    type EpisodeItem,
} from '../../components/shared/player/EpisodeList/EpisodeList';
import type { useListSheet } from '../../hooks/useListSheet';
import { t } from '../../i18n/t';
import page from '../shared/Page.module.css';

type ListSheetState = ReturnType<typeof useListSheet>;

interface ShowEpisodesProps {
    /** HomeView（SQUARE_QUERY）：清單收入 sheet；否則照舊係清單欄 */
    square: boolean;
    /** 橫版頁頭（直版 / HomeView 喺播放器上面，呢度冇） */
    header: ReactNode;
    items: EpisodeItem[];
    onSelect: (url: string) => void;
    /** 由「我的收藏」撳入嚟嗰集：捲過去、短暫 highlight */
    focusKey: string | undefined;
    list: ListSheetState;
}

/**
 * 集數清單：HomeView 收入由底升起嘅 sheet（頁頭清單掣開 / 閂；表頭已經寫「集數 / 共 N 集」，清單唔再出標題列）；
 * 其他裝置照舊係清單欄（橫版頁頭 + 集數清單）
 */
export const ShowEpisodes = ({
    square,
    header,
    items,
    onSelect,
    focusKey,
    list,
}: ShowEpisodesProps) =>
    square ? (
        <ListSheet
            open={list.open}
            onClose={list.close}
            title={t('episodes.title')}
            summary={episodeCountText(items)}
            returnFocusTo={list.buttonRef}
        >
            <EpisodeList items={items} onSelect={onSelect} focusKey={focusKey} heading={false} />
        </ListSheet>
    ) : (
        <div className={page.listColumn}>
            {header}
            <EpisodeList items={items} onSelect={onSelect} focusKey={focusKey} />
        </div>
    );

interface ShowHeaderActionsProps {
    items: EpisodeItem[];
    list: ListSheetState;
    /** 有節目資料先有 ⓘ（useItemInfoSheet gaugeInfo） */
    info: ComponentProps<typeof PageHeaderActions>['info'];
}

/** HomeView 頁頭右邊：清單掣（badge = 集數）+ ⓘ（_mockups_/home-view S5） */
export const ShowHeaderActions = ({ items, list, info }: ShowHeaderActionsProps) => {
    const count = episodeCount(items);
    const { buttonRef, open, toggle } = list;
    return (
        <PageHeaderActions info={info}>
            <ListButton
                ref={buttonRef}
                label={t('listSheet.showEpisodes', { count })}
                count={count}
                open={open}
                onToggle={toggle}
            />
        </PageHeaderActions>
    );
};
