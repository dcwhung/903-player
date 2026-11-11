/* 409 發佈被擋（episode ID 會消失）：Design Origin: mockup: _mockups_/admin/index.html#s9 */
import { t } from '../../i18n/t';

export function PublishBlocked({ missing }: { missing: readonly string[] }) {
    return (
        <div role="alert">
            <div className="note bad">
                {t('publish.blocked', { count: missing.length })}
                <ul>
                    {missing.map((id) => (
                        <li key={id}>
                            <code>{id}</code>
                        </li>
                    ))}
                </ul>
            </div>
            <p className="muted small">{t('publish.blockedHelp')}</p>
        </div>
    );
}
