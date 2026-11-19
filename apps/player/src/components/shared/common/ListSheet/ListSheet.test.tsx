import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { ListButton } from './ListButton';
import { ListSheet } from './ListSheet';

/** 頁頭清單掣 + 清單 sheet（同節目頁 HomeView 一樣嘅砌法） */
const Harness = ({
    initialOpen = false,
    withReturn = false,
}: {
    initialOpen?: boolean;
    /** 傳 returnFocusTo（清單掣）：自動開（冇撳過掣）閂咗都返清單掣 */
    withReturn?: boolean;
}) => {
    const [open, setOpen] = useState(initialOpen);
    const buttonRef = useRef<HTMLButtonElement>(null);
    return (
        <>
            <ListButton
                ref={buttonRef}
                label="集數清單，共 2 集"
                count={2}
                open={open}
                onToggle={() => setOpen((o) => !o)}
            />
            <ListSheet
                open={open}
                onClose={() => setOpen(false)}
                title="集數"
                summary="共 2 集"
                returnFocusTo={withReturn ? buttonRef : undefined}
            >
                <ul>
                    <li>28/11</li>
                    <li>21/11</li>
                </ul>
            </ListSheet>
        </>
    );
};

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
    );

afterEach(() => vi.unstubAllGlobals());

describe('ListSheet', () => {
    it('should render nothing while closed', () => {
        render(<Harness />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should rise as a dialog named by its title with the summary and the list inside', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: '集數清單，共 2 集' }));

        const dialog = screen.getByRole('dialog', { name: '集數' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(within(dialog).getByText('共 2 集')).toBeInTheDocument();
        expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByRole('button', { name: '集數清單，共 2 集' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    it('should move focus into the sheet when it opens', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: '集數清單，共 2 集' }));

        expect(screen.getByRole('dialog')).toHaveFocus();
    });

    it.each([
        ['✕', () => userEvent.click(screen.getByRole('button', { name: '關閉清單' }))],
        ['Escape', () => userEvent.keyboard('{Escape}')],
        ['the scrim', () => userEvent.click(screen.getByTestId('list-sheet-backdrop'))],
    ])('should close from %s and give focus back to the list button', async (_how, close) => {
        render(<Harness />);
        const opener = screen.getByRole('button', { name: '集數清單，共 2 集' });
        await userEvent.click(opener);

        await close();

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(opener).toHaveAttribute('aria-expanded', 'false');
        expect(opener).toHaveFocus();
    });

    it('should give focus to returnFocusTo when it opened with nothing focused', async () => {
        // W-795：一入頁就開（由「我的收藏」入嚟）：打開前焦點喺 <body>
        render(<Harness initialOpen withReturn />);

        await userEvent.keyboard('{Escape}');

        expect(screen.getByRole('button', { name: '集數清單，共 2 集' })).toHaveFocus();
    });

    it('should switch off at once when the user asks for reduced motion', async () => {
        stubReducedMotion(true);
        render(<Harness initialOpen />);

        await userEvent.click(screen.getByRole('button', { name: '關閉清單' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should use the given close label', () => {
        render(
            <ListSheet open onClose={vi.fn()} title="今日節目" closeLabel="關閉今日節目表">
                <p>內容</p>
            </ListSheet>,
        );

        expect(screen.getByRole('button', { name: '關閉今日節目表' })).toBeInTheDocument();
    });

    it('should top the sheet with a banner carrying the ✕ and put the action in the header', async () => {
        const onAction = vi.fn();
        render(
            <ListSheet
                open
                onClose={vi.fn()}
                title="集數"
                summary="共 2 集"
                banner={{ kind: 'arc', art: '/banner.webp', title: '三十六計', subtitle: '劇名' }}
                action={
                    <button type="button" onClick={onAction}>
                        全集
                    </button>
                }
            >
                <p>內容</p>
            </ListSheet>,
        );

        const sheet = screen.getByRole('dialog', { name: '集數' });
        const banner = within(sheet).getByTestId('info-banner');
        expect(within(banner).getByRole('heading')).toHaveTextContent('三十六計');
        expect(within(sheet).getByRole('button', { name: '關閉清單' })).toHaveAttribute(
            'data-on-banner',
        );
        expect(sheet).toHaveAttribute('data-banner', 'true');
        await userEvent.click(within(sheet).getByRole('button', { name: '全集' }));
        expect(onAction).toHaveBeenCalledOnce();
    });
});
