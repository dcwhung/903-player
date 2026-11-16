// @vitest-environment node
/* 還原掣、圓形還原掣、刪除掣（ghost-danger）：淺紅底 + 紅字（mockup admin-revert「顏色」） */
import { readFileSync } from 'node:fs';

const cssOf = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

const DANGER_SOFT = /\{[^}]*background:\s*var\(--danger-bg\);[^}]*color:\s*var\(--danger-ink\);/;

describe('revert / delete button colours', () => {
    it.each([
        ['theme.css', 'button.ghost-danger'],
        ['revert.css', 'button.revert-btn'],
        ['revert.css', 'button.slot-revert'],
    ])('%s %s should use --danger-bg with --danger-ink text', (file, selector) => {
        const css = cssOf(file);
        const at = css.indexOf(`${selector} {`);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(css.slice(at)).toMatch(
            new RegExp(`^${selector.replace('.', '\\.')}\\s*${DANGER_SOFT.source}`),
        );
    });
});

/* S-1012：「還原」掣高度同字型無關；.revert-mark 嘅 min-height 由同一組 custom property 計，唔手抄數字 */
describe('revert button height (S-1012)', () => {
    const css = cssOf('revert.css');
    const block = (selector: string) => {
        const at = css.indexOf(`${selector} {`);
        expect(at).toBeGreaterThanOrEqual(0);
        return css.slice(at, css.indexOf('}', at));
    };

    it('should give button.revert-btn a fixed line-height and padding from custom properties', () => {
        const rule = block('button.revert-btn');
        expect(rule).toMatch(/line-height:\s*var\(--revert-btn-line-height\);/);
        expect(rule).toMatch(/padding:\s*var\(--revert-btn-pad-y\)\s+10px;/);
    });

    it('should derive .revert-mark min-height from the same properties (no magic number)', () => {
        const rule = block('.revert-mark');
        expect(rule).toMatch(
            /min-height:\s*calc\(var\(--revert-btn-line-height\)\s*\+\s*2\s*\*\s*var\(--revert-btn-pad-y\)\);/,
        );
    });

    it('should keep the dialog revert button at the line-height of the other dialog buttons', () => {
        expect(block('button.revert-btn.dialog-revert')).toMatch(/line-height:\s*normal;/);
    });
});
