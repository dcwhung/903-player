import { PageDots } from '../components/PageDots/PageDots';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerCard } from '../components/PlayerPanel/PlayerCard';
import { ShowCardStack } from '../components/ShowCardStack/ShowCardStack';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { TodayEmpty } from '../components/TodayEmpty/TodayEmpty';
import { TodayShowList } from '../components/TodayShowList/TodayShowList';
import { useGoHome } from '../hooks/useGoHome';
import { t } from '../i18n/t';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useTodayPage } from './useTodayPage';

export const TodayPage = () => {
    const goHome = useGoHome();
    const { status, isSearching, current, index, items, cards, cardKeys, theme, ...actions } =
        useTodayPage();
    // 卡疊同指示點只有播得到嘅節目；節目表（items）另外有未上架嘅
    const names = cards.map((card) => card.title);

    // 標題同節目頁一樣（大字 h1）；卡入面係唱片、進度弧、播放掣同節目名，指示點喺卡外
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.header}>
                    <PageHeader title={t('today.title')} variant="title" onBack={goHome} />
                </div>
                <LoadState status={status} isEmpty={items.length === 0} isSearching={isSearching} />
                {/* 今日全部未上架：冇卡疊、唔自動播，節目表照列出（全部灰） */}
                {status === 'ready' && !current && items.length > 0 && (
                    <>
                        <TodayEmpty />
                        <TodayShowList items={items} onSelect={actions.selectShow} />
                    </>
                )}
                {status === 'ready' && current && (
                    <>
                        <div className={page.todayPlayer}>
                            <ShowCardStack
                                cards={cards}
                                index={index}
                                onChange={actions.selectIndex}
                            >
                                <PlayerCard title={names[index] ?? ''} art={theme.art} />
                            </ShowCardStack>
                            <PageDots
                                keys={cardKeys}
                                labels={names}
                                index={index}
                                onSelect={actions.selectIndex}
                            />
                        </div>
                        <TodayShowList items={items} onSelect={actions.selectShow} />
                    </>
                )}
            </main>
        </ThemeScope>
    );
};
