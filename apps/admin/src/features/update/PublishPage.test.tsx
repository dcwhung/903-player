import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse, PublishWarning } from '../../api/types';
import { PublishPage } from './PublishPage';

const WARNINGS: PublishWarning[] = [
    { kind: 'neutralTheme', target: 'dramas/fresh' },
    {
        kind: 'contrast',
        target: 'dramas/lancy',
        foreground: 'muted',
        background: 'surface',
        ratio: 3.9,
        minimum: 4.5,
    },
];

/** api catalog/publish.ts resolveImages 嘅真實錯誤格式 */
const BANNER_ERROR = 'banner: image long → 0123456789abcdef.webp not uploaded';

const changesOf = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    warnings: [],
    bannerChanged: false,
    ...over,
});

const show = (changes: ChangesResponse) =>
    renderAt('/publish', '/publish', <PublishPage />, fakeData({ changes: resource(changes) }));

describe('PublishPage', () => {
    it('should fold warnings into one summary line that still lets you publish', async () => {
        show(changesOf({ warnings: WARNINGS, bannerChanged: true }));
        expect(screen.getByText('2 項配色警告（不影響發佈）')).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: '配色警告' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
        await userEvent.click(screen.getByRole('button', { name: '展開' }));
        const list = screen.getByRole('list', { name: '配色警告' });
        expect(within(list).getByText(/fresh：未設定配色，現正使用中性灰/)).toBeInTheDocument();
        expect(within(list).getByRole('link', { name: '前往選擇' })).toHaveAttribute(
            'href',
            '/dramas/fresh/theme',
        );
        expect(within(list).getByRole('link', { name: '前往修改' })).toBeInTheDocument();
    });

    it('should expand every warning next to a validation error', () => {
        show(
            changesOf({
                warnings: WARNINGS,
                validation: { ok: false, error: BANNER_ERROR },
                changes: { items: [], timeline: [] },
            }),
        );
        expect(screen.getByRole('list', { name: '配色警告' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '展開' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
    });

    it('should explain a banner validation error in Chinese with a link to the Banner page', () => {
        show(changesOf({ validation: { ok: false, error: BANNER_ERROR }, warnings: [] }));
        const errors = screen.getByRole('list', { name: '錯誤' });
        expect(errors).toHaveTextContent('首頁 Banner 不完整：缺少闊版（2000 × 400）');
        expect(errors).toHaveTextContent('請重新更換 Banner，或還原預設');
        expect(within(errors).getByRole('link', { name: '前往 Banner 頁' })).toHaveAttribute(
            'href',
            '/banner',
        );
        expect(screen.queryByText(BANNER_ERROR)).not.toBeInTheDocument();
    });

    it('should fall back to the original text for an error it cannot explain', () => {
        const error = 'dramas/lancy: image tile.webp → 0123456789abcdef.webp not uploaded';
        show(changesOf({ validation: { ok: false, error } }));
        const errors = screen.getByRole('list', { name: '錯誤' });
        expect(errors).toHaveTextContent(error);
        expect(within(errors).queryByRole('link')).not.toBeInTheDocument();
    });

    it('should link an unexplained banner error to the Banner page with the original text', () => {
        const error = 'catalog.json: banner has an unknown key "wide"';
        show(changesOf({ validation: { ok: false, error } }));
        const errors = screen.getByRole('list', { name: '錯誤' });
        expect(errors).toHaveTextContent(error);
        expect(within(errors).getByRole('link', { name: '前往 Banner 頁' })).toBeInTheDocument();
    });

    it('should count a banner-only change as something to publish', () => {
        show(changesOf({ bannerChanged: true }));
        expect(screen.getByText('首頁 Banner 已更改')).toBeInTheDocument();
        expect(screen.getByText('本次只更改首頁 Banner。')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
    });

    it('should keep 發佈 disabled when nothing changed', () => {
        show(changesOf());
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
    });
});
