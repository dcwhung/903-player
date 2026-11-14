/* 確認發佈頁底：發佈結果（擋住 / 失敗 / 冇改）+「返回」（讀屏讀「返回待辦」）+ 大「發佈」掣（左邊 outline icon，mockup admin-style ④） */
import { ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/t';
import { PublishBlocked } from './PublishBlocked';
import type { PublishState } from './usePublish';

interface PublishActionsProps {
    state: PublishState;
    canPublish: boolean;
    onPublish: () => void;
}

export function PublishActions({ state, canPublish, onPublish }: PublishActionsProps) {
    const busy = state.status === 'publishing';
    return (
        <>
            {state.status === 'blocked' && <PublishBlocked missing={state.missing} />}
            {(state.status === 'failed' || state.status === 'unchanged') && (
                <p className={`note ${state.status === 'failed' ? 'bad' : 'info'}`} role="alert">
                    {state.message}
                </p>
            )}
            <div className="savebar">
                <Link className="btn back-link" to="/" aria-label={t('publish.backToTodos')}>
                    <ArrowLeft aria-hidden="true" />
                    {t('publish.back')}
                </Link>
                <button
                    type="button"
                    className="primary big"
                    disabled={!canPublish || busy}
                    onClick={onPublish}
                >
                    <Send aria-hidden="true" />
                    {busy ? t('publish.publishing') : t('publish.publish')}
                </button>
            </div>
        </>
    );
}
