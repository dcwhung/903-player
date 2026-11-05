/* 短篇 chips：即將上架（排最尾、撳唔到）、快將下架（LK1 琥珀小標）、成套劇快將下架嗰行（P8 #6） */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArcPicker } from './ArcPicker';

const UPCOMING = [{ arc: 'XXX', text: '12/11 上架', label: 'XXX，12/11（四）上架，未可以收聽' }];

const renderPicker = (onPick = vi.fn(), notice?: { text: string; replace: boolean }) =>
    render(
        <ArcPicker
            arcs={[
                {
                    arc: '戀愛二分一',
                    isNew: false,
                    leaving: { tag: '05/12', label: '05/12（六）下架' },
                },
                { arc: '初戀無限次', isNew: false },
            ]}
            upcoming={UPCOMING}
            selected="初戀無限次"
            playing={undefined}
            label="揀一個短篇開始收聽"
            notice={notice}
            onPick={onPick}
            onOpenAll={() => {}}
        />,
    );

describe('ArcPicker availability', () => {
    beforeEach(() => {
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    it('should put upcoming arcs last, not pressable, with their release day', async () => {
        const onPick = vi.fn();
        renderPicker(onPick);

        const chips = screen.getByRole('group', { name: '短篇' }).querySelectorAll('button');
        const soon = screen.getByRole('button', { name: UPCOMING[0]?.label });
        expect(chips[chips.length - 1]).toBe(soon);
        expect(soon).toHaveAttribute('aria-disabled', 'true');
        expect(soon).not.toHaveAttribute('aria-pressed');
        expect(soon).toHaveTextContent('XXX12/11 上架');
        await userEvent.click(soon);
        expect(onPick).not.toHaveBeenCalled();
    });

    it('should tag an arc leaving soon with the amber day and read the date out', () => {
        renderPicker();

        expect(
            screen.getByRole('button', { name: '戀愛二分一，05/12（六）下架' }),
        ).toHaveTextContent('戀愛二分一05/12');
    });

    it('should swap the pick line for the whole-drama leaving note when nothing has started', () => {
        renderPicker(vi.fn(), { text: '呢套劇 05/12（六）下架', replace: true });

        expect(screen.getByText('呢套劇 05/12（六）下架')).toBeInTheDocument();
        expect(screen.queryByText('揀一個短篇開始收聽')).not.toBeInTheDocument();
    });

    it('should keep the playing line and add the leaving note after it once started', () => {
        renderPicker(vi.fn(), { text: '呢套劇 05/12（六）下架', replace: false });

        expect(screen.getByText('揀一個短篇開始收聽')).toBeInTheDocument();
        expect(screen.getByText('呢套劇 05/12（六）下架')).toBeInTheDocument();
    });
});
