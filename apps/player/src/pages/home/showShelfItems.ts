import { formatAirDays } from '@903-player/catalog';
import todayArt from '../../assets/today-tile.webp';
import type { DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaShelf';
import { allShows } from '../../catalog/shows';
import { t } from '../../i18n/t';
import { zoomKey } from '../../utils/cardZoom';
import type { ShowOpeners } from './useShowOpeners';

/** 節目卡冇「繼續收聽」條：撳卡任何位都係入頁 */
const noResume = () => undefined;

/**
 * 新主頁（P10 lane 3，Duo 打開・橫 / HomeView）「節目」tab 嘅疊卡：7 個節目 + 今日節目，
 * 次序同節目格一樣；轉做書架卡（DramaShelfItem），同「廣播劇」tab 共用 DramaShelf 嘅疊卡 scroller。
 * 角落字係播放日（「星期一至五」），今日有新一集就左上角「新」；撳卡同節目格一樣（useShowOpeners）
 */
export const showShelfItems = (
    { openShow, openToday }: ShowOpeners,
    newShowIds: ReadonlySet<string>,
): DramaShelfItem[] => {
    const shows = allShows().map((show): DramaShelfItem => ({
        id: show.id,
        name: show.name,
        art: show.tileArt,
        meta: formatAirDays(show.airDays),
        ...(newShowIds.has(show.id) ? { newLabel: t('drama.newEpisode') } : {}),
        zoomKey: zoomKey.show(show.id),
        onOpen: () => openShow(show),
        onResume: noResume,
    }));
    const today: DramaShelfItem = {
        id: 'today',
        name: t('home.today'),
        art: todayArt,
        meta: '',
        caption: t('home.today'),
        zoomKey: zoomKey.today,
        onOpen: openToday,
        onResume: noResume,
    };
    return [...shows, today];
};
