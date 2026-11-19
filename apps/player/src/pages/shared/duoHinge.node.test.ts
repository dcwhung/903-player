// @vitest-environment node
// Duo 打開・橫內頁（P10 lane 4）：左欄清單分隔線對齊摺位，唔可以變返百分比（右欄有把手預留位，50% 會偏左）
import { cssDeclarations, readCss } from '../../../tests/cssRule';
import { DUO_OPEN_LANDSCAPE_QUERY } from '../../config/layout';

const css = readCss(new URL('./Page.module.css', import.meta.url));

describe('Duo open landscape inner pages', () => {
    it('should end the list column at the hinge (half the screen, minus the Duo inset and left safe area)', () => {
        expect(
            cssDeclarations(css, '.fixed', DUO_OPEN_LANDSCAPE_QUERY)['grid-template-columns'],
        ).toBe('calc(50vw - var(--duo-edge-inset) - env(safe-area-inset-left)) minmax(0, 1fr)');
    });
});
