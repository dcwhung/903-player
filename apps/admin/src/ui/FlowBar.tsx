/*
 * 由待辦入嚟嘅 flow bar：講明呢項仲欠乜 +「返回待辦」（ArrowLeft）。Design Origin: mockup: _mockups_/admin/index.html#s4（.flow-bar）
 */
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../i18n/t';

interface FlowBarProps {
    name: string;
    missing: readonly string[];
}

export function FlowBar({ name, missing }: FlowBarProps) {
    const status =
        missing.length > 0
            ? t('editor.flowMissing', { items: missing.join('、') })
            : t('editor.flowNothing');
    return (
        <div className="flow-bar" role="region" aria-label={t('editor.flowTitle')}>
            <span>
                <b>{t('editor.flowTitle')}</b> · {name} · {status}
            </span>
            <Link to="/">
                <ArrowLeft aria-hidden="true" />
                {t('editor.backToTodos')}
            </Link>
        </div>
    );
}
