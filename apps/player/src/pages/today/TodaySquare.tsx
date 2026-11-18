import { ItemInfoSheet } from '../../components/shared/common/ItemInfo/ItemInfoSheet';
import { ListButton } from '../../components/shared/common/ListSheet/ListButton';
import { ListSheet } from '../../components/shared/common/ListSheet/ListSheet';
import { PageHeaderActions } from '../../components/shared/common/PageHeader/PageHeaderActions';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { TodayEmpty } from '../../components/pages/today/TodayEmpty/TodayEmpty';
import {
    TodayShowList,
    type TodayShowItem,
} from '../../components/pages/today/TodayShowList/TodayShowList';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { useListSheet } from '../../hooks/useListSheet';
import { t } from '../../i18n/t';
import type { InnerPage } from '../../selectors/pageHandle';
import { LoadState } from '../shared/LoadState';
import page from '../shared/Page.module.css';
import { TodayHeader } from './TodayHeader';
import { TodaySquarePlayer } from './TodaySquarePlayer';
import type { TodayView } from './useTodayPage';
import { useTodayShowInfo } from './useTodayShowInfo';

type ListSheetState = ReturnType<typeof useListSheet>;
type InfoSheetState = ReturnType<typeof useTodayShowInfo>;

/** 頁頭右邊：清單掣（badge = 今日節目數）+ 而家個節目嘅 ⓘ（_mockups_/home-view S5 / S6） */
const SquareHeaderActions = ({
    count,
    list,
    info,
}: {
    count: number;
    list: ListSheetState;
    info: InfoSheetState['gaugeInfo'];
}) => {
    const { buttonRef, open, toggle } = list;
    return (
        <PageHeaderActions info={info}>
            <ListButton
                ref={buttonRef}
                label={t('listSheet.todayShows', { count })}
                count={count}
                open={open}
                onToggle={toggle}
            />
        </PageHeaderActions>
    );
};

/** 今日節目表 sheet：表頭「節目表 · N 個未上架」，入面係原本嘅節目表（播出時間 + 收聽狀態） */
const TodayListSheet = ({
    items,
    list,
    onSelect,
}: {
    items: TodayShowItem[];
    list: ListSheetState;
    onSelect: (key: string) => void;
}) => {
    const unavailable = items.filter((item) => item.status === 'unavailable').length;
    const { open, close, buttonRef } = list;
    return (
        <ListSheet
            open={open}
            onClose={close}
            title={t('today.listTitle')}
            summary={
                unavailable > 0 ? t('today.unavailableCount', { count: unavailable }) : undefined
            }
            returnFocusTo={buttonRef}
        >
            <TodayShowList items={items} onSelect={onSelect} heading={false} />
        </ListSheet>
    );
};

interface TodaySquareProps {
    state: TodayView;
    handlePage: InnerPage;
}

/**
 * HomeView 今日節目頁（SQUARE_QUERY，P10 lane 7a，_mockups_/home-view 今日節目 S6）：
 * 普通播放器 + 節目 selector；節目表收入頁頭清單掣開嘅 sheet，ⓘ 喺頁頭跟住而家個節目
 */
export const TodaySquare = ({ state, handlePage }: TodaySquareProps) => {
    const { status, isSearching, current, items, theme } = state;
    const list = useListSheet(undefined);
    const info = useTodayShowInfo(current?.showId);
    const listed = status === 'ready' && items.length > 0;
    const actions = listed && (
        <SquareHeaderActions count={items.length} list={list} info={info.gaugeInfo} />
    );
    return (
        <ThemeScope theme={theme}>
            <main
                className={`${page.page} ${page.locked} ${page.fixed}`}
                data-square-player=""
                data-square-today=""
            >
                <TodayHeader trailing={actions || undefined} handlePage={handlePage} />
                <LoadState status={status} isEmpty={items.length === 0} isSearching={isSearching} />
                {listed &&
                    (current ? (
                        <TodaySquarePlayer state={state} current={current} />
                    ) : (
                        <TodayEmpty />
                    ))}
                {listed && <TodayListSheet items={items} list={list} onSelect={state.selectShow} />}
                <ItemInfoSheet {...info.sheet} onClose={info.sheet.close} />
                <InnerPageHandle page={handlePage} />
            </main>
        </ThemeScope>
    );
};
