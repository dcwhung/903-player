import type { Progress } from '../services/progressStore';
import type { SeriesEpisode } from '../types/drama';
import { arcSummaries, seriesContinue } from './arcProgress';

const ep = (arc: string, no: number): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'chisee',
    url: `/${arc}-${no}.m4a`,
    arc,
    no,
});

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
    it('summarises each 短篇 in order when nothing has been played', () => {
        expect(arcSummaries(EPISODES, {})).toEqual([
            { arc: '甲', total: 2, watched: 0, state: 'new', resume: EPISODES[0], resumeAt: 0 },
            { arc: '乙', total: 2, watched: 0, state: 'new', resume: EPISODES[2], resumeAt: 0 },
            { arc: '丙', total: 1, watched: 0, state: 'new', resume: EPISODES[4], resumeAt: 0 },
        ]);
    });

    it('resumes the first unfinished episode, keeping its position', () => {
        const [, second] = arcSummaries(EPISODES, {
            [url(2)]: done(),
            [url(3)]: partway(400),
        });
        expect(second).toMatchObject({
            arc: '乙',
            watched: 1,
            state: 'started',
            resume: EPISODES[3],
            resumeAt: 400,
        });
    });

    it('counts a 短篇 as started once an episode has any progress', () => {
        expect(arcSummaries(EPISODES, { [url(0)]: partway(30) })[0]?.state).toBe('started');
    });

    it('moves finished 短篇 to the bottom, replaying from episode 1', () => {
        const summaries = arcSummaries(EPISODES, { [url(0)]: done(), [url(1)]: done() });
        expect(summaries.map((s) => s.arc)).toEqual(['乙', '丙', '甲']);
        expect(summaries.at(-1)).toMatchObject({
            state: 'done',
            watched: 2,
            resume: EPISODES[0],
            resumeAt: 0,
        });
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
