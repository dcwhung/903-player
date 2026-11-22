// @vitest-environment node
import { declarationsOutside, motionLeftOnWhenReduced } from '../../tests/cssRule';

const reduce = (rules: string): string => `@media (prefers-reduced-motion: reduce) { ${rules} }`;

describe('motionLeftOnWhenReduced', () => {
    it('should report nothing when the reduce block switches off every selector', () => {
        const css = `.a, .b[data-x='1'] { transition: opacity 1s; }
            ${reduce(".a,\n .b[data-x='1'] { transition: none; }")}`;

        expect(motionLeftOnWhenReduced(css)).toEqual([]);
    });

    it('should report a more specific selector when the reduce block does not repeat it', () => {
        const css = `.a { transition: opacity 1s; }
            .a[data-x='1'] { transition: transform 1s; }
            ${reduce('.a { transition: none; }')}`;

        expect(motionLeftOnWhenReduced(css)).toEqual([".a[data-x='1'] { transition }"]);
    });

    it('should tell transition and animation apart when only one is switched off', () => {
        const css = `.a { animation: spin 1s; } ${reduce('.a { transition: none; }')}`;

        expect(motionLeftOnWhenReduced(css)).toEqual(['.a { animation }']);
    });

    it('should skip motion when it only exists without a reduced motion preference', () => {
        const css = `@media (prefers-reduced-motion: no-preference) { .a { animation: spin 1s; } }
            .b { transition: none; }`;

        expect(motionLeftOnWhenReduced(css)).toEqual([]);
    });

    it('should count motion when it sits inside another media query', () => {
        const css = `@media (max-width: 339px) { .a { transition: opacity 1s; } }`;

        expect(motionLeftOnWhenReduced(css)).toEqual(['.a { transition }']);
    });

    it('should report the motion when the reduce block is written before the motion rule', () => {
        // S-1447：specificity 一樣，後寫先贏；reduce block 寫喺前面熄唔到
        const css = `${reduce('.a { transition: none; }')} .a { transition: opacity 1s; }`;

        expect(motionLeftOnWhenReduced(css)).toEqual(['.a { transition }']);
    });

    it('should report a longhand when nothing switches it off', () => {
        // S-1448
        const css = `.a { transition-duration: 1s; } .b { animation-name: spin; }
            ${reduce('.a { animation: none; }')}`;

        expect(motionLeftOnWhenReduced(css)).toEqual([
            '.a { transition-duration }',
            '.b { animation-name }',
        ]);
    });

    it('should accept a shorthand or longhand that switches the same kind of motion off', () => {
        const css = `.a { transition-property: opacity; transition-duration: 1s; }
            .b { animation-duration: 1s; }
            .c { transition: opacity 1s; }
            .d { animation-name: spin; }
            ${reduce(`.a { transition: none 0s; } .b { animation: none; }
                .c { transition-duration: 0s; } .d { animation-name: none; }`)}`;

        expect(motionLeftOnWhenReduced(css)).toEqual([]);
    });

    it('should not count longhands that cannot start motion on their own', () => {
        const css = `.a { animation-play-state: running; animation-timing-function: linear;
            transition-delay: 1s; transition-duration: 0s; }`;

        expect(motionLeftOnWhenReduced(css)).toEqual([]);
    });
});

const CSS = `
:root { --a: 1px; }
@supports (height: 1cqh) {
    :root { --b: 100cqh; }
}
@supports not (height: 1cqh) {
    :root { --c: 100dvh; }
    @media (max-height: 561px) {
        .x { height: 50dvh; }
    }
}
@media (max-width: 339px) {
    .y { --d: 2px; }
}
`;

describe('declarationsOutside', () => {
    it('should return top-level and other at-rule declarations but skip the excluded chain', () => {
        expect(declarationsOutside(CSS, '@supports not (height: 1cqh)')).toEqual([
            { context: undefined, selector: ':root', prop: '--a', value: '1px' },
            {
                context: '@supports (height: 1cqh)',
                selector: ':root',
                prop: '--b',
                value: '100cqh',
            },
            { context: '@media (max-width: 339px)', selector: '.y', prop: '--d', value: '2px' },
        ]);
    });

    it('should collapse whitespace in the prelude before matching', () => {
        const props = declarationsOutside(CSS, '@supports   not  (height: 1cqh)').map(
            (d) => d.prop,
        );

        expect(props).toEqual(['--a', '--b', '--d']);
    });

    it('should not treat a prelude with different spacing inside the condition as the same chain', () => {
        const props = declarationsOutside(CSS, '@supports not (height:1cqh)').map((d) => d.prop);

        expect(props).toEqual(['--a', '--b', '--c', 'height', '--d']);
    });
});
