import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerTitles } from './PlayerTitles';

const HINT = { description: '左右方向鍵或左右掃動轉集' };

describe('PlayerTitles', () => {
    it('steps with the arrow keys when the switcher itself is focused', async () => {
        const onStep = vi.fn();
        render(<PlayerTitles title="公子會" dateLabel="17/10（六）" onStep={onStep} />);

        screen.getByRole('group', HINT).focus();
        await userEvent.keyboard('{ArrowRight}{ArrowLeft}');

        expect(onStep.mock.calls).toEqual([['next'], ['previous']]);
    });

    it('ignores arrow keys pressed on an element inside the switcher', async () => {
        const onStep = vi.fn();
        render(
            <PlayerTitles
                title="公子會"
                dateLabel="17/10（六）"
                onStep={onStep}
                accessory={<button type="button">指示點</button>}
            />,
        );

        screen.getByRole('button', { name: '指示點' }).focus();
        await userEvent.keyboard('{ArrowRight}{ArrowLeft}');

        expect(onStep).not.toHaveBeenCalled();
    });

    it('is a plain title block without a switcher when it cannot step', () => {
        render(<PlayerTitles title="公子會" dateLabel="17/10（六）" />);

        expect(screen.queryByRole('group')).not.toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '公子會' })).toBeInTheDocument();
    });
});
