import { ShelfColumn } from '../../components/pages/home/DramaShelf/DramaShelf';
import type { DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaTile';
import type { HomeTab } from '../../hooks/useHomeTab';
import { t } from '../../i18n/t';

interface ShelfGridProps {
    tab: HomeTab;
    showItems: readonly DramaShelfItem[];
    dramaItems: readonly DramaShelfItem[];
    busy: boolean;
    /** 有播放卡（split）先疊；冇就兩欄（用戶 2026-11-17：疊卡變兩欄鋪滿） */
    stacked: boolean;
}

/**
 * 新主頁（P10 lane 3，SHELF_SPLIT_QUERY：Duo 打開・橫、HomeView）左欄：節目 / 廣播劇都係 DramaShelf 書架，
 * 疊卡用盡橫額同分類掣下面剩低嘅高度；換 tab 由第一張開始
 */
export const ShelfGrid = ({ tab, showItems, dramaItems, busy, stacked }: ShelfGridProps) =>
    tab === 'shows' ? (
        <ShelfColumn
            key={tab}
            items={showItems}
            stacked={stacked}
            label={t('home.showsNav')}
            busy={busy}
        />
    ) : (
        <ShelfColumn key={tab} items={dramaItems} stacked={stacked} />
    );
