import { useListSheet } from '../../hooks/useListSheet';
import type { SeriesDramaView } from './useDramaPage';

/** 表閂晒（短篇表 / 由短篇表換去嘅全集表）而播緊（載入咗）另一個短篇：跟返播緊嗰個（W-796） */
const followPlaying = (view: SeriesDramaView) => {
    const playing = view.start === undefined ? view.upNext?.arc : undefined;
    if (playing !== undefined && playing !== view.arc) view.followPlayingArc();
};

/**
 * 跟住用戶喺邊一層（_mockups_/home-view 廣播劇頁、S8）：未揀短篇 = 全集（清單掣開全集表）；
 * 揀咗 / 播緊短篇 = 嗰個短篇（清單掣開短篇表，表頭「全集」掣換返全集表）。
 * 全集表開閂沿用頁面原本嘅（第一次入自動開）；短篇表由「我的收藏」入嚟（focusKey）自動開。
 * W-796（用戶 2026-11-18 揀方案 A）：全集表撳行揀短篇 → 即刻換去嗰個短篇嘅短篇表（同「全集」掣
 * 互換一樣，一閂一開），撳一集就播；未揀短篇（冇嘢播）揀都一樣開，跟「揀咗 = 短篇層」。
 * 播緊 A 揀咗 B、短篇表閂咗冇播 B：跟返播緊嗰個短篇，頁面 / badge / 短篇表講返同一個
 */
export const useSquareSheets = (view: SeriesDramaView) => {
    const arcList = useListSheet(view.focusKey);
    const all = view.sheet;
    const layer = view.empty || view.arc === undefined ? 'all' : 'arc';
    // 揀未聽短篇自動彈嘅短篇資料先睇：資料表閂咗先出短篇表（唔好兩張 modal 疊埋）
    const arcOpen = layer === 'arc' && arcList.open && !view.infoSheet.open;
    const closeAll = () => {
        all.close();
        arcList.close();
        followPlaying(view);
    };
    const toggle = () => {
        if (all.open || arcOpen) closeAll();
        else if (layer === 'all') all.openSheet();
        else arcList.toggle();
    };
    const showAll = () => {
        arcList.close();
        all.openSheet();
    };
    const pickArc = (arc: string) => {
        all.pick(arc);
        arcList.show();
    };
    return { layer, arcOpen, open: all.open || arcOpen, toggle, closeAll, showAll, pickArc };
};
