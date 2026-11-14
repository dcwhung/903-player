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
