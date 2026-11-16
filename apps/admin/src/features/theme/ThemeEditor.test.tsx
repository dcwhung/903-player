import { NEUTRAL_THEME } from '@903-player/catalog';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasIcon } from '../../../tests/icons';
import { themeOf, type EntryTheme } from '../../model/theme';
import { readDiscPixels } from './discPixels';
import { ThemeEditor } from './ThemeEditor';

vi.mock('./discPixels', () => ({ readDiscPixels: vi.fn() }));

/** 碟面：米白為主、橙紅 + 青綠點綴（蘭茜） */
const LANCY_PIXELS = new Uint8ClampedArray(
    [
        ...Array.from({ length: 60 }, () => [233, 223, 196, 255]),
        ...Array.from({ length: 25 }, () => [212, 95, 50, 255]),
        ...Array.from({ length: 15 }, () => [143, 188, 178, 255]),
    ].flat(),
);

const LANCY_THEME = themeOf({
    theme: {
        bg: '#f3efde',
        surface: '#faf7ec',
        track: '#e0d6b8',
        accent: '#d45f32',
        onAccent: '#ffffff',
        title: '#a8401a',
        text: '#33281d',
        muted: '#6b5a47',
        shadowDark: '#dcd3b8',
        shadowLight: '#ffffff',
        scheme: 'light',
        accentText: '#a8401a',
        titleFont: "'Noto Serif TC', serif",
        headerRule: 'linear-gradient(90deg, #d45f32 0 60%, #8fbcb2 60%)',
    },
});

const renderEditor = (
    current = LANCY_THEME,
    onApply = vi.fn((_theme: EntryTheme) => Promise.resolve(true)),
) => {
    render(
        <ThemeEditor
            name="蘭茜"
            sub="廣播劇 · 18 集"
            discUrl="/catalog/v1/img/disc.webp"
            current={current}
            onApply={onApply}
        />,
    );
    return onApply;
};

const cards = () => within(screen.getByRole('group', { name: '配色候選' })).getAllByRole('button');

describe('ThemeEditor', () => {
    beforeEach(() => vi.mocked(readDiscPixels).mockResolvedValue(LANCY_PIXELS));

    it('should show 現用 plus three extracted candidates, each a small player preview with AA / ⚠', async () => {
        renderEditor();
        await waitFor(() => expect(cards()).toHaveLength(4));
        const [current, ...candidates] = cards();
        expect(current).toHaveTextContent('現用');
        expect(current).toHaveAttribute('aria-pressed', 'true');
        expect(current).toHaveTextContent('蘭茜');
        expect(current).toHaveTextContent('第 3 集 · 播放中');
        candidates.forEach((card) => expect(card.textContent).toMatch(/AA|⚠ \d/));
        expect(screen.getByText('第 1 / 3 組')).toBeInTheDocument();
        expect(screen.queryByText(/儲存時保留/)).not.toBeInTheDocument();
    });

    it('should disable 套用 while 現用 is selected and apply the picked candidate', async () => {
        const onApply = renderEditor();
        const apply = screen.getByRole('button', { name: '套用' });
        expect(hasIcon(apply, 'check')).toBe(true);
        expect(apply).toBeDisabled();
        await waitFor(() => expect(cards()).toHaveLength(4));
        await userEvent.click(cards()[3] as HTMLElement);
        expect(apply).toBeEnabled();
        await userEvent.click(apply);
        const applied = onApply.mock.calls[0]?.[0];
        expect(applied?.scheme).toBe('light');
        expect(applied?.statusBar).toBe(applied?.accentText);
        expect(applied?.titleFont).toBe(LANCY_THEME.titleFont);
        expect(applied?.headerRule).toBe(LANCY_THEME.headerRule);
        expect(await screen.findByText(/已套用「主色淺底」/)).toBeInTheDocument();
    });

    it('should rotate to the next three candidates and wrap around', async () => {
        renderEditor();
        await waitFor(() => expect(cards()).toHaveLength(4));
        const more = screen.getByRole('button', { name: '更換另外三套' });
        expect(hasIcon(more, 'refresh-cw')).toBe(true);
        const firstRound = cards().map((card) => card.textContent);
        await userEvent.click(more);
        expect(screen.getByText('第 2 / 3 組')).toBeInTheDocument();
        expect(cards().map((card) => card.textContent)).not.toEqual(firstRound);
        await userEvent.click(more);
        await userEvent.click(more);
        expect(screen.getByText('第 1 / 3 組')).toBeInTheDocument();
    });

    it('should mark a new drama as 未設定（中性灰） and suggest the first candidate without applying it', async () => {
        const onApply = renderEditor(themeOf({ theme: { ...NEUTRAL_THEME } }));
        await waitFor(() => expect(cards()).toHaveLength(4));
        const [current, suggested] = cards();
        expect(current).toHaveTextContent('現用：未設定（中性灰）');
        expect(current).toHaveTextContent('未設定');
        expect(suggested).toHaveTextContent('建議');
        expect(onApply).not.toHaveBeenCalled();
    });

    it('should explain when there is no disc to extract from', () => {
        render(
            <ThemeEditor
                name="新節目"
                sub="節目"
                discUrl={undefined}
                current={LANCY_THEME}
                onApply={vi.fn()}
            />,
        );
        expect(screen.getByText('未有碟面圖片，上載碟面後即可由碟面抽色。')).toBeInTheDocument();
    });
});
