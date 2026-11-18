import { useMemo } from 'react';
import { PageDots } from '../../components/shared/common/PageDots/PageDots';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { TodayShowList } from '../../components/pages/today/TodayShowList/TodayShowList';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import {
    LANDSCAPE_LAYOUT_QUERY,
    SHORT_LANDSCAPE_LAYOUT_QUERY,
    SQUARE_QUERY,
} from '../../config/layout';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { InnerPage } from '../../selectors/pageHandle';
import page from '../shared/Page.module.css';
import { TodayHeader } from './TodayHeader';
import { TodayPlayerColumn } from './TodayPlayerColumn';
import { TodaySquare } from './TodaySquare';
import { useTodayInfoExpanded } from './useTodayInfo';
import { useTodayPage, type TodayView } from './useTodayPage';

interface TodayLayoutProps {
    state: TodayView;
    handlePage: InnerPage;
}

/** 手機 / 平板 / 電腦 / Duo：卡疊 + 指示點，節目表喺頁面（直版下面、橫版左欄） */
const TodayStandard = ({ state, handlePage }: TodayLayoutProps) => {
    const { status, current, index, items, cards, cardKeys, theme } = state;
    // 卡疊同指示點只有播得到嘅節目；節目表（items）另外有未上架嘅
    const names = cards.map((card) => card.title);
    const listed = status === 'ready' && items.length > 0;
    const info = useTodayInfoExpanded(listed && items.some((item) => item.info));
    const landscape = useMediaQuery(LANDSCAPE_LAYOUT_QUERY);
    // 手機打橫：指示點搬上頁頭右邊，騰返高度畀唱片
    const dotsInHeader = useMediaQuery(SHORT_LANDSCAPE_LAYOUT_QUERY);
    const dots = listed && current && (
        <PageDots keys={cardKeys} labels={names} index={index} onSelect={state.selectIndex} />
    );
    // 橫版有節目表：頁頭喺左欄節目表上面；否則（直版 / 未有節目表）喺播放器上面
    const headerInList = landscape && listed;
    const header = (
        <TodayHeader trailing={dotsInHeader ? dots : undefined} handlePage={handlePage} />
    );

    // 標題同節目頁一樣（大字 h1）；卡入面係唱片、進度弧、播放掣同節目名，指示點喺卡外。
    // 橫版左欄（頁頭 + 節目表）、右欄（卡疊 + 現正播放）；直版兩欄 display: contents，次序照舊
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <TodayPlayerColumn
                    state={state}
                    listed={listed}
                    landscape={landscape}
                    header={!headerInList && header}
                    dots={!dotsInHeader && dots}
                />
                {listed && (
                    <div className={page.listColumn}>
                        {headerInList && header}
                        <TodayShowList
                            items={items}
                            onSelect={state.selectShow}
                            infoExpanded={info.expanded}
                            onToggleInfo={info.toggle}
                        />
                    </div>
                )}
                <InnerPageHandle page={handlePage} />
            </main>
        </ThemeScope>
    );
};

export const TodayPage = () => {
    const state = useTodayPage();
    // 把手「呢頁自己嘅嘢」= 呢頁列緊嗰日（星期日係備用日子），同頁面同一個日子來源（W-525）
    const { date } = state;
    const handlePage = useMemo<InnerPage>(() => ({ kind: 'today', date }), [date]);
    // HomeView（P10 lane 7a）：普通播放器 + 節目 selector，節目表收入頁頭清單掣開嘅 sheet
    const square = useMediaQuery(SQUARE_QUERY);
    return square ? (
        <TodaySquare state={state} handlePage={handlePage} />
    ) : (
        <TodayStandard state={state} handlePage={handlePage} />
    );
};
