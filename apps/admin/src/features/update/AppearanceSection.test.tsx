import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../../../tests/renderApp';
import { AppearanceSection } from './AppearanceSection';

const TEXT = { name: '903 Plus', shortName: null, description: '簡介' };

beforeEach(() => {
    mockApi({
        'GET /api/branding': () => ({ body: { icon: null, text: TEXT, updatedAt: 'b1' } }),
        'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
    });
});

describe('AppearanceSection', () => {
    it('should list only the changed items with 項目 · 狀態 · 發佈 and ticked boxes', async () => {
        render(
            <AppearanceSection
                appearance={{ icon: true, text: true, banner: false }}
                unpicked={new Set()}
                onToggle={vi.fn()}
            />,
        );
        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
        expect(headers).toEqual(['項目', '狀態', '發佈']);
        expect(screen.getByRole('checkbox', { name: '發佈App 圖示' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: '發佈名稱與簡介' })).toBeChecked();
        expect(screen.queryByText('首頁 Banner')).not.toBeInTheDocument();
        // 圖示還原咗（草稿 null）= 內建預設；名稱與簡介有自訂
        expect(await screen.findByText('內建預設 · 未發佈')).toBeInTheDocument();
        expect(screen.getByText('自訂 · 未發佈')).toBeInTheDocument();
    });

    it('should render nothing when no appearance item changed', () => {
        const { container } = render(
            <AppearanceSection
                appearance={{ icon: false, text: false, banner: false }}
                unpicked={new Set()}
                onToggle={vi.fn()}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('should untick an unpicked item and report toggles', async () => {
        const onToggle = vi.fn();
        render(
            <AppearanceSection
                appearance={{ icon: false, text: false, banner: true }}
                unpicked={new Set(['banner'] as const)}
                onToggle={onToggle}
            />,
        );
        const box = screen.getByRole('checkbox', { name: '發佈首頁 Banner' });
        expect(box).not.toBeChecked();
        await userEvent.click(box);
        expect(onToggle).toHaveBeenCalledWith('banner');
    });
});
