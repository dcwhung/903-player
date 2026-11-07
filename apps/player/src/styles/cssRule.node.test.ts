// @vitest-environment node
import { declarationsOutside } from '../../tests/cssRule';

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
