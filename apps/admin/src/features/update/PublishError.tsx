/*
 * 發佈前驗證錯誤（擋住發佈）：Design Origin: mockup: _mockups_/admin-phase4/index.html#f（.issues.bad）
 * api 原文（英文）經 validationMessage 譯做中文，譯唔到就顯示原文；講首頁 Banner 嘅錯誤加「前往 Banner 頁」
 */
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/t';
import { isBannerProblem, validationMessage } from '../editor/validationMessage';

const BANNER_PATH = '/banner';

export function PublishError({ error }: { error: string }) {
    const banner = isBannerProblem(error);
    return (
        <ul className="issues bad" aria-label={t('publish.errorLabel')}>
            <li>
                <X aria-hidden="true" />
                <span>
                    {validationMessage(error) ?? error}
                    {banner && <small>{t('validation.bannerHint')}</small>}
                </span>
                {banner && <Link to={BANNER_PATH}>{t('publish.toBanner')}</Link>}
            </li>
        </ul>
    );
}
