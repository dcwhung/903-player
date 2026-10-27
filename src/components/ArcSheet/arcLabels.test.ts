import type { ArcState, ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { GROUP_TITLES, playLabel, rowLabel, visibleStatus } from './arcLabels';

const ARC = '小提議';
const OTHER_ARC = '別個短篇';
const TOTAL = 4;
const RESUME_NO = 2;
const RESUME_AT_SECONDS = 65;

const episode = (arc: string, no: number): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'chisee',
    url: `https://example.com/${arc}/${no}.mp3`,
    arc,
    no,
});

const WATCHED_BY_STATE = { new: 0, started: 1, done: TOTAL } as const satisfies Record<
    ArcState,
    number
>;

const summary = (state: ArcState, overrides: Partial<ArcSummary> = {}): ArcSummary => ({
    arc: ARC,
    total: TOTAL,
    watched: WATCHED_BY_STATE[state],
    state,
    isNew: false,
    resume: episode(ARC, state === 'started' ? RESUME_NO : 1),
    resumeAt: 0,
    ...overrides,
});

const elsewhere = episode(OTHER_ARC, 1);

describe('visibleStatus', () => {
    it('should show the playing episode when the arc is current', () => {
        expect(visibleStatus(summary('started'), episode(ARC, 3))).toBe('播緊第 3 集');
    });

    it('should show the episode count when the arc is new', () => {
        expect(visibleStatus(summary('new'), elsewhere)).toBe('未聽 · 4 集');
    });

    it('should show the episode count when the arc is done', () => {
        expect(visibleStatus(summary('done'), undefined)).toBe('聽完 · 4 集');
    });

    it('should show the next episode when the arc is started with no position', () => {
        expect(visibleStatus(summary('started'), elsewhere)).toBe('下一集係第 2 集');
    });

    it('should show the resume time when the arc is started part-way', () => {
        const s = summary('started', { resumeAt: RESUME_AT_SECONDS });
        expect(visibleStatus(s, elsewhere)).toBe('聽到第 2 集 1:05');
    });

    it('should append the new label when the arc is freshly added', () => {
        expect(visibleStatus(summary('new', { isNew: true }), elsewhere)).toBe(
            '未聽 · 4 集，新上架',
        );
    });
});

describe('rowLabel', () => {
    it('should add the watched count when the arc is started', () => {
        expect(rowLabel(summary('started'), elsewhere)).toBe('下一集係第 2 集，聽完 1 / 4 集');
    });

    it('should add the watched count when the started arc is current', () => {
        expect(rowLabel(summary('started'), episode(ARC, 2))).toBe('播緊第 2 集，聽完 1 / 4 集');
    });

    it('should not add the watched count when the arc is new or done', () => {
        expect(rowLabel(summary('new'), elsewhere)).toBe('未聽 · 4 集');
        expect(rowLabel(summary('done'), elsewhere)).toBe('聽完 · 4 集');
    });

    it('should end with the new label when the arc is freshly added', () => {
        expect(rowLabel(summary('started', { isNew: true }), elsewhere)).toBe(
            '下一集係第 2 集，聽完 1 / 4 集，新上架',
        );
    });
});

describe('playLabel', () => {
    it('should offer pause when the current arc is playing', () => {
        expect(playLabel(summary('started'), true, true)).toBe(`暫停 ${ARC}`);
    });

    it('should offer play when the current arc is paused', () => {
        expect(playLabel(summary('done'), true, false)).toBe(`播放 ${ARC}`);
    });

    it('should offer the first episode when the arc is new', () => {
        expect(playLabel(summary('new'), false, true)).toBe(`播放 ${ARC} 第 1 集`);
    });

    it('should offer a replay when the arc is done', () => {
        expect(playLabel(summary('done'), false, false)).toBe(`由第 1 集重聽 ${ARC}`);
    });

    it('should offer to resume when the arc is started', () => {
        expect(playLabel(summary('started'), false, false)).toBe(`續聽 ${ARC} 第 2 集`);
    });
});

describe('GROUP_TITLES', () => {
    it('should map every group to its i18n key', () => {
        expect(GROUP_TITLES).toEqual({
            playing: 'drama.groupPlaying',
            new: 'drama.groupNew',
            unfinished: 'drama.groupUnfinished',
            done: 'drama.groupDone',
        });
    });
});
