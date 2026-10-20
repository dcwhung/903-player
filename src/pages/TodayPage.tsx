import { PageDots } from '../components/PageDots/PageDots';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { ShowCardStack } from '../components/ShowCardStack/ShowCardStack';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { TodayShowList } from '../components/TodayShowList/TodayShowList';
import { useGoHome } from '../hooks/useGoHome';
import { t } from '../i18n/t';
import { formatDateLabel } from '../utils/date';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useTodayPage } from './useTodayPage';

export const TodayPage = () => {
    const goHome = useGoHome();
    const { status, isSearching, current, index, items, cards, theme, selectIndex, selectShow } =
        useTodayPage();
    const names = items.map((item) => item.name);

    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.header}>
                    <PageHeader title={t('today.title')} onBack={goHome} />
                </div>
                <LoadState status={status} isEmpty={!current} isSearching={isSearching} />
                {status === 'ready' && current && (
                    <>
                        <ShowCardStack cards={cards} index={index} onChange={selectIndex}>
                            <PlayerPanel
                                title={names[index] ?? ''}
                                dateLabel={formatDateLabel(current.date)}
                                art={theme.art}
                                accessory={
                                    <PageDots
                                        keys={items.map((item) => item.key)}
                                        labels={names}
                                        index={index}
                                        onSelect={selectIndex}
                                    />
                                }
                            />
                        </ShowCardStack>
                        <TodayShowList items={items} onSelect={selectShow} />
                    </>
                )}
            </main>
        </ThemeScope>
    );
};
