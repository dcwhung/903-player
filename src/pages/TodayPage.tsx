import { PageDots } from '../components/PageDots/PageDots';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerCard } from '../components/PlayerPanel/PlayerCard';
import { ShowCardStack } from '../components/ShowCardStack/ShowCardStack';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { TodayShowList } from '../components/TodayShowList/TodayShowList';
import { useGoHome } from '../hooks/useGoHome';
import { t } from '../i18n/t';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useTodayPage } from './useTodayPage';

export const TodayPage = () => {
    const goHome = useGoHome();
    const { status, isSearching, current, index, items, cards, theme, selectIndex, selectShow } =
        useTodayPage();
    const names = items.map((item) => item.name);

    // 標題同節目頁一樣（大字 h1）；卡只有唱片、進度弧同節目名，指示點同控制掣喺卡外（每個節目一樣）
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.header}>
                    <PageHeader title={t('today.title')} variant="title" onBack={goHome} />
                </div>
                <LoadState status={status} isEmpty={!current} isSearching={isSearching} />
                {status === 'ready' && current && (
                    <>
                        <div className={page.todayPlayer}>
                            <ShowCardStack cards={cards} index={index} onChange={selectIndex}>
                                <PlayerCard title={names[index] ?? ''} art={theme.art} />
                            </ShowCardStack>
                            <PageDots
                                keys={items.map((item) => item.key)}
                                labels={names}
                                index={index}
                                onSelect={selectIndex}
                            />
                        </div>
                        <TodayShowList items={items} onSelect={selectShow} />
                    </>
                )}
            </main>
        </ThemeScope>
    );
};
