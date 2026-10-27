import { fireEvent, render, screen } from '@testing-library/react';
import { AppVersion } from './AppVersion';

describe('AppVersion', () => {
    it('should show the formatted version when given a version', () => {
        render(<AppVersion version="0.2.0" />);

        expect(screen.getByText('v0.2.0')).toBeInTheDocument();
    });

    it('should give screen readers a spoken label when rendered', () => {
        render(<AppVersion version="0.2.0" />);

        expect(screen.getByText('版本 0.2.0')).toBeInTheDocument();
        expect(screen.getByText('v0.2.0')).toHaveAttribute('aria-hidden', 'true');
    });

    describe('hidden viewport debug', () => {
        const badge = () => screen.getByText('v0.2.0').parentElement as HTMLElement;
        const tap = (times: number) => {
            for (let i = 0; i < times; i += 1) fireEvent.click(badge());
        };
        const dialog = () => screen.queryByRole('dialog', { name: 'Viewport debug' });

        afterEach(() => vi.restoreAllMocks());

        it('should do nothing new on a single tap', () => {
            render(<AppVersion version="0.2.0" />);

            tap(1);

            expect(dialog()).not.toBeInTheDocument();
        });

        it('should open the metrics panel after 5 quick taps', () => {
            render(<AppVersion version="0.2.0" />);

            tap(5);

            expect(dialog()).toBeInTheDocument();
            expect(dialog()).toHaveTextContent('innerWidth × innerHeight');
            expect(dialog()).toHaveTextContent('mini player gap to bottom');
        });

        it('should copy the playback log when the panel opens', async () => {
            const writeText = vi.fn(async () => undefined);
            vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
            render(<AppVersion version="0.2.0" />);

            tap(5);

            expect(writeText).toHaveBeenCalledTimes(1);
            expect(await screen.findByText(/copied \d+ lines/)).toBeInTheDocument();
            vi.unstubAllGlobals();
        });

        it('should not open when the taps are too slow', () => {
            const now = vi.spyOn(Date, 'now');
            render(<AppVersion version="0.2.0" />);

            [0, 600, 1200, 1800, 2400].forEach((time) => {
                now.mockReturnValue(time);
                tap(1);
            });

            expect(dialog()).not.toBeInTheDocument();
        });

        it('should close on Escape', () => {
            render(<AppVersion version="0.2.0" />);
            tap(5);

            fireEvent.keyDown(document, { key: 'Escape' });

            expect(dialog()).not.toBeInTheDocument();
        });

        it('should close when the panel is tapped', () => {
            render(<AppVersion version="0.2.0" />);
            tap(5);

            fireEvent.click(dialog() as HTMLElement);

            expect(dialog()).not.toBeInTheDocument();
        });

        it('should close again after another 5 taps', () => {
            render(<AppVersion version="0.2.0" />);
            tap(5);

            tap(5);

            expect(dialog()).not.toBeInTheDocument();
        });
    });
});
