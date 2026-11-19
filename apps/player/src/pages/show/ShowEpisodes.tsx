import type { ComponentProps, ReactNode } from 'react';
import { InfoBanner } from '../../components/shared/common/ItemInfo/InfoBanner';
import { ListButton } from '../../components/shared/common/ListSheet/ListButton';
import { ListSheet } from '../../components/shared/common/ListSheet/ListSheet';
import { PageHeaderActions } from '../../components/shared/common/PageHeader/PageHeaderActions';
import {
    EpisodeList,
    episodeCount,
    episodeCountText,
    type EpisodeItem,
} from '../../components/shared/player/EpisodeList/EpisodeList';
import type { ItemInfoSheetView } from '../../hooks/useItemInfoSheet';
import type { useListSheet } from '../../hooks/useListSheet';
import { t } from '../../i18n/t';
import page from '../shared/Page.module.css';

type ListSheetState = ReturnType<typeof useListSheet>;

/*
 * 節目頁 / 每日劇集數清單頂（v2.0.1 用戶反饋 2026-11-19）：同資料 sheet 同一個 banner（useShowInfo /
 * useDailyInfo 嘅 sheet.banner：圖 + 名 + 播放時間），同一個比例同樣式；冇箭咀，主持 / 簡介撳 ⓘ 睇。
 * 冇圖（冇 banner）就同資料 sheet 一樣唔出，清單照舊由「集數 / 共 N 集」開始
 */

/** HomeView 集數表：banner 做表頂（✕ 疊喺圖上），同資料 sheet 一樣比例 */
export const listSheetInfo = ({ banner }: ItemInfoSheetView['sheet']) => ({
    banner,
    bannerSize: 'info' as const,
});

/** 其他裝置：banner 喺清單欄「集數 / 共 N 集」上面，同清單一齊捲（EpisodeList top） */
export const listTop = ({ banner }: ItemInfoSheetView['sheet']) =>
    banner && <InfoBanner banner={banner} placement="list" />;

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
    /** 節目資料（useShowInfo sheet）：清單頂 banner（listSheetInfo / listTop） */
    info: ItemInfoSheetView['sheet'];
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
    info,
}: ShowEpisodesProps) =>
    square ? (
        <ListSheet
            open={list.open}
            onClose={list.close}
            title={t('episodes.title')}
            summary={episodeCountText(items)}
            returnFocusTo={list.buttonRef}
            {...listSheetInfo(info)}
        >
            <EpisodeList items={items} onSelect={onSelect} focusKey={focusKey} heading={false} />
        </ListSheet>
    ) : (
        <div className={page.listColumn}>
            {header}
            <EpisodeList
                items={items}
                onSelect={onSelect}
                focusKey={focusKey}
                top={listTop(info)}
            />
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
