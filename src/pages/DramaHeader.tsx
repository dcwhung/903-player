import { PageHeader } from '../components/PageHeader/PageHeader';
import { useGoHome } from '../hooks/useGoHome';
import page from './Page.module.css';

/** 劇名做頁頭標題（同節目頁一樣） */
export const DramaHeader = ({ title }: { title: string }) => {
    const goHome = useGoHome();
    return (
        <div className={page.header}>
            <PageHeader title={title} variant="title" onBack={goHome} />
        </div>
    );
};
