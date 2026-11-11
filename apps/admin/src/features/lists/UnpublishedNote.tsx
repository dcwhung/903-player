/* 「有 N 項變更尚未發佈…前往發佈」（mockup ⑤ .note.warn） */
import { Link } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';

export function UnpublishedNote() {
    const count = useAdminData().changes.data?.changes.items.length ?? 0;
    if (count === 0) return null;
    return (
        <p className="note warn">
            {t('list.unpublished', { count })}
            <Link to="/publish">{t('list.goPublish')}</Link>
        </p>
    );
}
