import { useFadeOut } from '../../../../hooks/useFadeOut';
import { useGoHome } from '../../../../hooks/useGoHome';
import { usePageHandle } from '../../../../hooks/usePageHandle';
import { t } from '../../../../i18n/t';
import type { HandleStatus, InnerPage, PageHandleView } from '../../../../selectors/pageHandle';
import { PlayerHandle } from '../PlayerHandle/PlayerHandle';

const LABEL = {
    playing: 'pageHandle.playing',
    paused: 'pageHandle.paused',
} as const satisfies Record<HandleStatus, string>;

const handleKey = ({ status, name }: PageHandleView) => `${status}:${name}`;

/**
 * 闊橫版內頁（節目頁、劇集頁、今日節目頁）右邊把手：播緊 / 暫停緊（或者主頁閂咗卡）嘅唔係呢頁嘅嘢先出，
 * 色同名跟嗰樣嘢；撳 = 返回掣（返主頁，把手放大做右邊播放卡）。
 * 變咗係呢頁自己嘅（例如喺呢頁開始播）就淡出先拆走，之後預留位先收（Page.module.css）
 */
export const InnerPageHandle = ({ page }: { page: InnerPage }) => {
    const { shown, leaving, onLeft } = useFadeOut(usePageHandle(page), handleKey);
    const goHome = useGoHome();
    if (!shown) return null;
    return (
        <PlayerHandle
            variant="page"
            theme={shown.theme}
            name={shown.name}
            status={shown.status}
            label={t(LABEL[shown.status], { name: shown.name })}
            onActivate={goHome}
            leaving={leaving}
            onLeft={onLeft}
        />
    );
};
