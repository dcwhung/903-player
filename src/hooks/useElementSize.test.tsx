import { act, render, screen } from '@testing-library/react';
import { useRef, type CSSProperties } from 'react';
import { useElementSize } from './useElementSize';

/** 假版面：clientWidth / clientHeight 由測試話幾大 */
const layout = { width: 0, height: 0 };

/** 假 ResizeObserver：測試手動 trigger（模擬外部轉大細，例如轉向） */
let resize = () => {};
class FakeResizeObserver {
    constructor(callback: () => void) {
        resize = callback;
    }
    observe() {}
    disconnect() {}
}

const Probe = ({ style, tick }: { style?: CSSProperties; tick?: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { width, height, uiScale } = useElementSize(ref, tick);
    return (
        <div ref={ref} style={style} data-tick={tick}>
            {`${width}×${height}@${uiScale}`}
        </div>
    );
};

describe('useElementSize', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
            () => layout.width,
        );
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
            () => layout.height,
        );
    });
    afterEach(() => vi.restoreAllMocks());

    it('should measure on the first commit, before any resize event', () => {
        Object.assign(layout, { width: 968, height: 452 });

        render(<Probe />);

        expect(screen.getByText('968×452@1')).toBeInTheDocument();
    });

    it('should pick up a new size in the same commit that changed the layout key', () => {
        Object.assign(layout, { width: 600, height: 452 });
        const { rerender } = render(<Probe tick={1} />);

        Object.assign(layout, { width: 968, height: 452 });
        act(() => rerender(<Probe tick={2} />));

        expect(screen.getByText('968×452@1')).toBeInTheDocument();
    });

    it('should follow resizes from outside React', () => {
        Object.assign(layout, { width: 600, height: 452 });
        render(<Probe />);

        Object.assign(layout, { width: 1012, height: 562 });
        act(() => resize());

        expect(screen.getByText('1012×562@1')).toBeInTheDocument();
    });

    it('should read --ui-scale from the element', () => {
        Object.assign(layout, { width: 968, height: 452 });

        render(<Probe style={{ ['--ui-scale' as string]: 1.3 }} />);

        expect(screen.getByText('968×452@1.3')).toBeInTheDocument();
    });
});
