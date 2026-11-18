import type { ReactNode } from 'react';
import { PageHeader } from '../../components/shared/common/PageHeader/PageHeader';
import { useGoHome } from '../../hooks/useGoHome';
import { t } from '../../i18n/t';
import type { InnerPage } from '../../selectors/pageHandle';
import page from '../shared/Page.module.css';

/** 今日頁頭（大字 h1）；手機打橫指示點 / HomeView 清單掣 + ⓘ 喺右邊 */
export const TodayHeader = ({
    trailing,
    handlePage,
}: {
    trailing: ReactNode;
    handlePage: InnerPage;
}) => {
    const goHome = useGoHome(handlePage);
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
