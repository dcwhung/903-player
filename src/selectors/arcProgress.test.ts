import type { Progress } from '../services/progressStore';
import type { SeriesEpisode } from '../types/drama';
import {
    arcGroups,
    arcSummaries,
    hasNewUnheardArc,
    isArcNew,
    listOrder,
    seriesContinue,
} from './arcProgress';

const ep = (arc: string, no: number, addedAt?: string): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'chisee',
    url: `/${arc}-${no}.m4a`,
    arc,
    no,
    ...(addedAt ? { addedAt } : {}),
});
const TODAY = '2026-10-23';

const done = (updatedAt = 1): Progress => ({
    position: 990,
    duration: 1000,
    watched: true,
    updatedAt,
});
const partway = (position: number, updatedAt = 1): Progress => ({
    position,
    duration: 1000,
    watched: false,
    updatedAt,
});

// 甲 2 集、乙 2 集、丙 1 集
const EPISODES = [ep('甲', 1), ep('甲', 2), ep('乙', 1), ep('乙', 2), ep('丙', 1)];
const url = (i: number) => EPISODES[i]?.url ?? '';

describe('arcSummaries', () => {
    it('summarises each 短篇 in catalogue order when nothing has been played', () => {
        expect(arcSummaries(EPISODES, {}, TODAY)).toEqual([
            {
                arc: '甲',
                total: 2,
                watched: 0,
                state: 'new',
                isNew: false,
                resume: EPISODES[0],
                resumeAt: 0,
            },
            {
                arc: '乙',
                total: 2,
                watched: 0,
                state: 'new',
                isNew: false,
                resume: EPISODES[2],
                resumeAt: 0,
            },
            {
                arc: '丙',
                total: 1,
                watched: 0,
                state: 'new',
                isNew: false,
                resume: EPISODES[4],
                resumeAt: 0,
            },
        ]);
    });

    it('resumes the first unfinished episode, keeping its position', () => {
        const [, second] = arcSummaries(
            EPISODES,
            { [url(2)]: done(), [url(3)]: partway(400) },
            TODAY,
        );
        expect(second).toMatchObject({
            arc: '乙',
            watched: 1,
            state: 'started',
            resume: EPISODES[3],
            resumeAt: 400,
        });
    });

    it('counts a 短篇 as started once an episode has any progress', () => {
        expect(arcSummaries(EPISODES, { [url(0)]: partway(30) }, TODAY)[0]?.state).toBe('started');
    });

    it('replays a finished 短篇 from episode 1', () => {
        const [first] = arcSummaries(EPISODES, { [url(0)]: done(), [url(1)]: done() }, TODAY);
        expect(first).toMatchObject({
            state: 'done',
            watched: 2,
            resume: EPISODES[0],
            resumeAt: 0,
        });
    });

    it('marks a 短篇 added within the last 14 days as new', () => {
        const episodes = [ep('甲', 1, '2026-10-10'), ep('乙', 1, '2026-10-09')];
        expect(arcSummaries(episodes, {}, TODAY).map((a) => a.isNew)).toEqual([true, false]);
    });
});

describe('isArcNew', () => {
    it('is new from the day it is added for 14 days', () => {
        expect(isArcNew('2026-10-23', TODAY)).toBe(true);
        expect(isArcNew('2026-10-10', TODAY)).toBe(true);
        expect(isArcNew('2026-10-09', TODAY)).toBe(false);
        expect(isArcNew(undefined, TODAY)).toBe(false);
        expect(isArcNew('2026-10-24', TODAY)).toBe(false);
    });
});

describe('arcGroups', () => {
    const summaries = arcSummaries(
        [ep('甲', 1), ep('乙', 1), ep('丙', 1, '2026-10-20'), ep('丁', 1), ep('戊', 1)],
        { '/甲-1.m4a': done(), '/丁-1.m4a': partway(10) },
        TODAY,
    );

    it('orders playing, then new, then unfinished, then finished, skipping empty groups', () => {
        expect(arcGroups(summaries, '丁').map((g) => [g.group, g.items.map((s) => s.arc)])).toEqual(
            [
                ['playing', ['丁']],
                ['new', ['丙']],
                ['unfinished', ['乙', '戊']],
                ['done', ['甲']],
            ],
        );
        expect(arcGroups(summaries, undefined).map((g) => g.group)).toEqual([
            'new',
            'unfinished',
            'done',
        ]);
    });

    it('keeps a playing 新 短篇 in the playing group only', () => {
        expect(arcGroups(summaries, '丙').map((g) => [g.group, g.items.map((s) => s.arc)])).toEqual(
            [
                ['playing', ['丙']],
                ['unfinished', ['乙', '丁', '戊']],
                ['done', ['甲']],
            ],
        );
    });
});

describe('hasNewUnheardArc', () => {
    const episodes = [ep('甲', 1), ep('乙', 1, '2026-10-20'), ep('乙', 2, '2026-10-20')];

    it('is true while a new 短篇 has not been touched at all', () => {
        expect(hasNewUnheardArc(episodes, {}, TODAY)).toBe(true);
    });

    it('turns false once any episode of the new 短篇 has progress, or after 14 days', () => {
        expect(hasNewUnheardArc(episodes, { '/乙-2.m4a': partway(5) }, TODAY)).toBe(false);
        expect(hasNewUnheardArc(episodes, {}, '2026-11-03')).toBe(false);
    });
});

describe('listOrder', () => {
    it('keeps unfinished episodes in order and sends finished ones to the bottom', () => {
        const arc = [ep('甲', 1), ep('甲', 2), ep('甲', 3)];
        const map = { '/甲-1.m4a': done(), '/甲-3.m4a': done() };
        expect(listOrder(arc, map, undefined).map((e) => e.no)).toEqual([2, 1, 3]);
    });

    it('never moves the loaded episode down, even when it was finished before', () => {
        const arc = [ep('甲', 1), ep('甲', 2)];
        expect(listOrder(arc, { '/甲-1.m4a': done() }, '/甲-1.m4a').map((e) => e.no)).toEqual([
            1, 2,
        ]);
    });
});

describe('seriesContinue', () => {
    it('has nothing to continue before anything is played', () => {
        expect(seriesContinue(EPISODES, {})).toBeUndefined();
    });

    it('continues the last episode touched, with how far it got', () => {
        const result = seriesContinue(EPISODES, {
            [url(0)]: done(1),
            [url(3)]: partway(250, 9),
        });
        expect(result).toEqual({ episode: EPISODES[3], ratio: 0.25 });
    });

    it('points at the next episode, from its start, after finishing one', () => {
        expect(seriesContinue(EPISODES, { [url(1)]: done() })).toEqual({
            episode: EPISODES[2],
            ratio: 0,
        });
    });
});
