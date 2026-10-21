import type { ReactNode } from 'react';
import { PageDots } from '../components/PageDots/PageDots';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerCard } from '../components/PlayerPanel/PlayerCard';
import { ShowCardStack, type StackCard } from '../components/ShowCardStack/ShowCardStack';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { TodayEmpty } from '../components/TodayEmpty/TodayEmpty';
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
    const { status, isSearching, current, index, items, cards, cardKeys, theme, ...actions } =
        useTodayPage();
    // 卡疊同指示點只有播得到嘅節目；節目表（items）另外有未上架嘅
    const names = cards.map((card) => card.title);
    const listed = status === 'ready' && items.length > 0;
    // 手機打橫：指示點搬上頁頭右邊，騰返高度畀唱片
    const dotsInHeader = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    const dots = listed && current && (
        <PageDots keys={cardKeys} labels={names} index={index} onSelect={actions.selectIndex} />
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
                    <LoadState
                        status={status}
                        isEmpty={items.length === 0}
                        isSearching={isSearching}
                    />
                    {/* 今日有節目播但一個都未上架：冇卡疊、唔自動播，節目表照列出成日（全部灰） */}
                    {listed &&
                        (current ? (
                            <TodayStack
                                cards={cards}
                                index={index}
                                title={names[index] ?? ''}
                                art={theme.art}
                                onChange={actions.selectIndex}
                                dots={!dotsInHeader && dots}
                            />
                        ) : (
                            <TodayEmpty />
                        ))}
                </div>
                {listed && (
                    <div className={page.listColumn}>
                        <TodayShowList items={items} onSelect={actions.selectShow} />
                    </div>
                )}
            </main>
        </ThemeScope>
    );
};
