import type { Drama, ShowConfig } from '@903-player/catalog';
import {
    arcInfoSections,
    dailyInfoSections,
    hasItemInfo,
    hasNoItemProgress,
    seriesHasInfo,
    shouldAutoOpenArcInfo,
    shouldAutoOpenInfo,
    showInfoSections,
} from './itemInfo';

const show = (patch: Partial<ShowConfig> = {}): ShowConfig =>
    ({ id: 'sat', name: '公子會', airDays: [6], ...patch }) as ShowConfig;

const drama = (patch: Partial<Drama> = {}): Drama =>
    ({ id: 'lancy', name: '蘭茜夫人劇場', kind: 'series', ...patch }) as Drama;

const progress = { position: 10, duration: 600, watched: false, updatedAt: 0 };

describe('hasItemInfo', () => {
    it('should be false when nothing but airDays is there', () => {
        expect(hasItemInfo({})).toBe(false);
    });

    it('should be true when any one of summary, hosts, cast or airTime is there', () => {
        expect(hasItemInfo({ summary: '簡介' })).toBe(true);
        expect(hasItemInfo({ hosts: ['甲'] })).toBe(true);
        expect(hasItemInfo({ cast: ['乙'] })).toBe(true);
        expect(hasItemInfo({ airTime: { start: '15:00', end: '16:00' } })).toBe(true);
    });

    it('should not count an empty name list', () => {
        expect(hasItemInfo({ hosts: [], cast: [] })).toBe(false);
    });
});

describe('showInfoSections', () => {
    it('should be empty when the show has no info', () => {
        expect(showInfoSections(show())).toEqual([]);
    });

    it('should give one section with the air time text, hosts and summary', () => {
        const sections = showInfoSections(
            show({
                airTime: { start: '22:00', end: '23:45' },
                hosts: ['主持甲'],
                summary: '簡介',
            }),
        );
        expect(sections).toEqual([
            {
                kind: 'show',
                title: '公子會',
                airTime: '星期六（22:00 - 23:45）',
                hosts: ['主持甲'],
                summary: '簡介',
            },
        ]);
    });

    it('should leave out the air time when the show has no airTime', () => {
        expect(showInfoSections(show({ summary: '簡介' }))).toEqual([
            { kind: 'show', title: '公子會', summary: '簡介' },
        ]);
    });
});

describe('dailyInfoSections', () => {
    it('should give the drama name and summary, or nothing without a summary', () => {
        expect(dailyInfoSections(drama({ kind: 'daily', summary: '每日' }))).toEqual([
            { kind: 'drama', title: '蘭茜夫人劇場', summary: '每日' },
        ]);
        expect(dailyInfoSections(drama({ kind: 'daily' }))).toEqual([]);
    });
});

describe('arcInfoSections', () => {
    const arc = { summary: '短篇簡介', cast: ['聲演甲'] };

    it('should put the drama summary first, then the arc titled by its label', () => {
        expect(arcInfoSections(drama({ summary: '劇集簡介' }), '戀愛二分一', arc)).toEqual([
            { kind: 'drama', title: '蘭茜夫人劇場', summary: '劇集簡介' },
            { kind: 'arc', title: '戀愛二分一', cast: ['聲演甲'], summary: '短篇簡介' },
        ]);
    });

    it('should give only the arc when the drama has no summary', () => {
        expect(arcInfoSections(drama(), '戀愛二分一', arc)).toEqual([
            { kind: 'arc', title: '戀愛二分一', cast: ['聲演甲'], summary: '短篇簡介' },
        ]);
    });

    it('should give only the drama when the arc has no info', () => {
        expect(arcInfoSections(drama({ summary: '劇集簡介' }), '戀愛二分一', {})).toEqual([
            { kind: 'drama', title: '蘭茜夫人劇場', summary: '劇集簡介' },
        ]);
        expect(arcInfoSections(drama(), '戀愛二分一', undefined)).toEqual([]);
    });
});

describe('seriesHasInfo', () => {
    it('should be true when the drama or any arc has info', () => {
        expect(seriesHasInfo(drama({ summary: '劇集' }), [])).toBe(true);
        expect(seriesHasInfo(drama(), [undefined, {}, { cast: ['甲'] }])).toBe(true);
    });

    it('should be false when neither the drama nor any arc has info', () => {
        expect(seriesHasInfo(drama(), [undefined, {}])).toBe(false);
    });
});

describe('hasNoItemProgress', () => {
    it('should be true when no episode of the show has progress', () => {
        expect(hasNoItemProgress('show', 'sat', { 'show:satx:2026-11-14': progress })).toBe(true);
    });

    it('should be false when any episode of the show or drama has progress', () => {
        expect(hasNoItemProgress('show', 'sat', { 'show:sat:2026-11-14': progress })).toBe(false);
        expect(hasNoItemProgress('drama', 'c18', { 'drama:c18:2026-11-14': progress })).toBe(false);
    });
});

describe('shouldAutoOpenInfo', () => {
    const fresh = { hasInfo: true, hasProgress: false, loaded: false, focused: false };

    it('should open on a first visit with info', () => {
        expect(shouldAutoOpenInfo(fresh)).toBe(true);
    });

    it('should not open without info, with progress, while loaded or from bookmarks', () => {
        expect(shouldAutoOpenInfo({ ...fresh, hasInfo: false })).toBe(false);
        expect(shouldAutoOpenInfo({ ...fresh, hasProgress: true })).toBe(false);
        expect(shouldAutoOpenInfo({ ...fresh, loaded: true })).toBe(false);
        expect(shouldAutoOpenInfo({ ...fresh, focused: true })).toBe(false);
    });
});

describe('shouldAutoOpenArcInfo', () => {
    it('should open for a picked arc with no progress that has info', () => {
        expect(shouldAutoOpenArcInfo('new', { cast: ['甲'] })).toBe(true);
    });

    it('should not open for an arc with progress, without info or unknown', () => {
        expect(shouldAutoOpenArcInfo('started', { cast: ['甲'] })).toBe(false);
        expect(shouldAutoOpenArcInfo('done', { summary: '簡介' })).toBe(false);
        expect(shouldAutoOpenArcInfo('new', {})).toBe(false);
        expect(shouldAutoOpenArcInfo(undefined, { cast: ['甲'] })).toBe(false);
    });
});
