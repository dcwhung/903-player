import type { ReactNode } from 'react';
import { PageDots } from '../components/PageDots/PageDots';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { TodayShowList } from '../components/TodayShowList/TodayShowList';
import { LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY } from '../config/layout';
import { useGoHome } from '../hooks/useGoHome';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { t } from '../i18n/t';
import page from './Page.module.css';
import { TodayPlayerColumn } from './TodayPlayerColumn';
import { useTodayPage } from './useTodayPage';

/** 今日頁頭（大字 h1）；手機打橫指示點搬上右邊 */
const TodayHeader = ({ trailing }: { trailing: ReactNode }) => {
    const goHome = useGoHome();
    return (
        <div className={page.header}>
            <PageHeader
                title={t('today.title')}
                variant="title"
                onBack={goHome}
                trailing={trailing}
            />
        </div>
    );
};

export const TodayPage = () => {
    const state = useTodayPage();
    const { status, current, index, items, cards, cardKeys, theme } = state;
    // 卡疊同指示點只有播得到嘅節目；節目表（items）另外有未上架嘅
    const names = cards.map((card) => card.title);
    const listed = status === 'ready' && items.length > 0;
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    // 手機打橫：指示點搬上頁頭右邊，騰返高度畀唱片
    const dotsInHeader = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    const dots = listed && current && (
        <PageDots keys={cardKeys} labels={names} index={index} onSelect={state.selectIndex} />
    );
    // 橫版有節目表：頁頭喺左欄節目表上面；否則（直版 / 未有節目表）喺播放器上面
    const headerInList = landscape && listed;
    const header = <TodayHeader trailing={dotsInHeader ? dots : undefined} />;

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
                        <TodayShowList items={items} onSelect={state.selectShow} />
                    </div>
                )}
            </main>
        </ThemeScope>
    );
};
