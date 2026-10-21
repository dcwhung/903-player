import type { ReactNode } from 'react';
import { PageDots } from '../components/PageDots/PageDots';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerCard } from '../components/PlayerPanel/PlayerCard';
import { ShowCardStack, type StackCard } from '../components/ShowCardStack/ShowCardStack';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { TodayShowList } from '../components/TodayShowList/TodayShowList';
import { SHORT_LANDSCAPE_QUERY } from '../config/layout';
import { useGoHome } from '../hooks/useGoHome';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { t } from '../i18n/t';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useTodayPage } from './useTodayPage';

interface TodayStackProps {
    cards: StackCard[];
    index: number;
    title: string;
    art: string | undefined;
    onChange: (index: number) => void;
    /** 卡疊下面嘅指示點；手機打橫搬咗上頁頭就冇 */
    dots: ReactNode;
}

/** 今日節目卡疊（最上面係播放器）+ 卡外嘅指示點，一組唔縮 */
const TodayStack = ({ cards, index, title, art, onChange, dots }: TodayStackProps) => (
    <div className={page.todayPlayer}>
        <ShowCardStack cards={cards} index={index} onChange={onChange}>
            <PlayerCard title={title} art={art} />
        </ShowCardStack>
        {dots}
    </div>
);

export const TodayPage = () => {
    const goHome = useGoHome();
    const { status, isSearching, current, index, items, cards, theme, selectIndex, selectShow } =
        useTodayPage();
    const names = items.map((item) => item.name);
    const ready = status === 'ready' && current;
    // 手機打橫：指示點搬上頁頭右邊，騰返高度畀唱片
    const dotsInHeader = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    const dots = ready && (
        <PageDots
            keys={items.map((item) => item.key)}
            labels={names}
            index={index}
            onSelect={selectIndex}
        />
    );

    // 標題同節目頁一樣（大字 h1）；卡入面係唱片、進度弧、播放掣同節目名，指示點喺卡外。
    // 橫版左欄（頁頭 + 卡疊）、右欄（節目表）；直版兩欄 display: contents，次序照舊
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={`${page.playerColumn} ${page.todayColumn}`}>
                    <div className={page.header}>
                        <PageHeader
                            title={t('today.title')}
                            variant="title"
                            onBack={goHome}
                            trailing={dotsInHeader ? dots : undefined}
                        />
                    </div>
                    <LoadState status={status} isEmpty={!current} isSearching={isSearching} />
                    {ready && (
                        <TodayStack
                            cards={cards}
                            index={index}
                            title={names[index] ?? ''}
                            art={theme.art}
                            onChange={selectIndex}
                            dots={!dotsInHeader && dots}
                        />
                    )}
                </div>
                {ready && (
                    <div className={page.listColumn}>
                        <TodayShowList items={items} onSelect={selectShow} />
                    </div>
                )}
            </main>
        </ThemeScope>
    );
};
