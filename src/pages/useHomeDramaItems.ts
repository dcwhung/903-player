import { useNavigate } from 'react-router-dom';
import type { DramaShelfItem } from '../components/DramaShelf/DramaShelf';
import { dramaEpisodesOf, enabledDramas, seriesEpisodesOf, type DramaConfig } from '../dramas';
import { useAudioBusy } from '../hooks/useAudioBusy';
import { useDramaContinue } from '../hooks/useDramaContinue';
import { useDramaNewLabels } from '../hooks/useDramaNewLabels';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStartDrama } from '../hooks/useStartDrama';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { seriesArcs } from '../selectors/dramas';
import { dramaShelfOrder } from '../selectors/dramaShelf';
import { getProgressMap } from '../services/progressStore';

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
    return dramaShelfOrder(enabledDramas(), dramaEpisodesOf, progressMap);
};

/**
 * 廣播劇 tab 嘅劇集格：
 * - 撳格：入頁。短篇劇集永遠唔播（用戶可能只係想睇清單）；每日劇集同節目格一樣，冇其他嘢佔住先播
 * - 撳「繼續收聽」條：唔入頁，淨係播續聽嗰集（mini player 跟住顯示）；用戶明確要播，會蓋過其他嘢
 */
export const useDramaItems = (): DramaShelfItem[] => {
    const navigate = useNavigate();
    const startDrama = useStartDrama();
    const busy = useAudioBusy();
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
            if (drama.kind === 'daily' && !busy) startDrama(drama);
            navigate(`/drama/${drama.id}`);
        },
        onResume: () => startDrama(drama),
    }));
};
