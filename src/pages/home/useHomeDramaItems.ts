import { useMemo } from 'react';
import type { DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaShelf';
import {
    dramaEpisodesOf,
    enabledDramas,
    seriesEpisodesOf,
    type DramaConfig,
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
import { useTileOpen, type HomeRight } from './useTileOpen';

/** 劇集格右下角：短篇劇集「N 個短篇」（分季嘅「全 N 季」），每日劇集「每日更新」 */
const dramaMeta = (drama: DramaConfig): string => {
    if (drama.kind !== 'series') return t('drama.daily');
    const count = seriesArcs(seriesEpisodesOf(drama.id)).length;
    return t(drama.arcUnit === 'season' ? 'drama.seasonCount' : 'drama.arcCount', { count });
};

/** 廣播劇 tab 嘅劇集次序（見 dramaShelfOrder）；轉集、有集數聽完就按新進度重新排 */
const useShelfDramas = (): DramaConfig[] => {
    const player = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, player.recording]);
    // 播放中主頁跟 currentTime 成日 re-render；progressMap 由 useRefreshedOn 出，reference 穩定，
    // 劇集清單又係 module 常數，所以只係進度真係重新讀過先再排（S-481）
    return useMemo(
        () => dramaShelfOrder(enabledDramas(), dramaEpisodesOf, progressMap),
        [progressMap],
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
    const shelf = useShelfDramas();
    return shelf.map((drama) => ({
        id: drama.id,
        name: drama.name,
        art: drama.tileArt,
        meta: dramaMeta(drama),
        newLabel: newLabels.get(drama.id),
        resume: continueOf(drama),
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
};
