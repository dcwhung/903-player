import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/shared/common/PageHeader/PageHeader';
import { useGoHome } from '../../hooks/useGoHome';
import page from '../shared/Page.module.css';

/** 劇名做頁頭標題（同節目頁一樣）；返主頁按呢套劇嘅把手揀過場（useGoHome） */
export const DramaHeader = ({ title }: { title: string }) => {
    const { dramaId = '' } = useParams();
    const goHome = useGoHome({ kind: 'drama', dramaId });
    return (
        <div className={page.header}>
            <PageHeader title={title} variant="title" onBack={goHome} />
        </div>
    );
};
