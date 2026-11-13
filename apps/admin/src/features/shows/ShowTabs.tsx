/*
 * 節目分頁：基本資料 / 配色（同廣播劇分頁一樣嘅 .tabs，2026-11-13 用戶要求分開）；保留 ?from=todos。
 * 新節目未儲存冇碟面可以抽色，所以唔出分頁（淨係基本資料）
 */
import { Link, useLocation } from 'react-router-dom';
import { t } from '../../i18n/t';
import { showEditorPath } from '../../model/paths';

export type ShowTab = 'basic' | 'theme';

const SUFFIX: Record<ShowTab, string> = { basic: '', theme: '/theme' };

export function ShowTabs({ id, tab }: { id: string; tab: ShowTab }) {
    const { search } = useLocation();
    const labels: Record<ShowTab, string> = {
        basic: t('show.tabBasic'),
        theme: t('show.tabTheme'),
    };
    return (
        <nav className="tabs" aria-label={t('show.tabsLabel')}>
            {(Object.keys(SUFFIX) as ShowTab[]).map((key) => (
                <Link
                    key={key}
                    to={`${showEditorPath(id)}${SUFFIX[key]}${search}`}
                    aria-current={key === tab ? 'page' : undefined}
                >
                    {labels[key]}
                </Link>
            ))}
        </nav>
    );
}
