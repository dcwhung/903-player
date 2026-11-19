// @vitest-environment node
// e2e/visualScenes.mjs（「現有裝置零改變」截圖比對嘅情境清單）：日間情境（9d 睡眠 timer lane 0）。
// 月亮掣淨係喺裝置本地 21:00–05:00 出，日間情境證明 14:00 嘅畫面零改變；
// 時區固定 VISUAL_TIMEZONE（visualDiff.mjs 開 context 用），唔跟跑嘅機
import { VISUAL_DAY_NOW, VISUAL_TIMEZONE, dayScenes } from '../e2e/visualModel.mjs';
import { VISUAL_SCENES } from '../e2e/visualScenes.mjs';

const DAY_SOURCES = ['home-paused', 'show', 'today'];
const NIGHT_START_HOUR = 21;
const NIGHT_END_HOUR = 5;

/** VISUAL_TIMEZONE 嘅本地鐘數 */
const localHour = (iso: string) =>
    Number(
        new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            hourCycle: 'h23',
            timeZone: VISUAL_TIMEZONE,
        }).format(new Date(iso)),
    );

describe('VISUAL_TIMEZONE / VISUAL_DAY_NOW', () => {
    it('時區固定香港', () => {
        expect(VISUAL_TIMEZONE).toBe('Asia/Hong_Kong');
    });

    it('日間時間喺香港係 14:00，唔喺 21:00–05:00 夜間時段', () => {
        const hour = localHour(VISUAL_DAY_NOW);
        expect(hour).toBe(14);
        expect(hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR).toBe(false);
    });
});

describe('dayScenes', () => {
    const run = async () => {};
    const seed = async () => {};
    const scenes = [
        { id: 'a', run },
        { id: 'b', seed, run, now: '2026-11-29T22:30:00+08:00' },
    ];

    it('複製指定情境：id 加 -day、now 換做日間，seed / run 照用', () => {
        expect(dayScenes(scenes, ['b', 'a'], VISUAL_DAY_NOW)).toEqual([
            { id: 'b-day', seed, run, now: VISUAL_DAY_NOW },
            { id: 'a-day', run, now: VISUAL_DAY_NOW },
        ]);
    });

    it('冇呢個情境：throw', () => {
        expect(() => dayScenes(scenes, ['nope'], VISUAL_DAY_NOW)).toThrow(/nope/);
    });
});

describe('VISUAL_SCENES', () => {
    it('id 唔重複', () => {
        const ids = VISUAL_SCENES.map((scene) => scene.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('有 home-paused / show / today 嘅日間版，行為同原本一樣', () => {
        for (const id of DAY_SOURCES) {
            const night = VISUAL_SCENES.find((scene) => scene.id === id);
            const day = VISUAL_SCENES.find((scene) => scene.id === `${id}-day`);
            expect(night, id).toBeDefined();
            expect(day, `${id}-day`).toBeDefined();
            expect(day?.now).toBe(VISUAL_DAY_NOW);
            expect(day?.run).toBe(night?.run);
            expect(day?.seed).toBe(night?.seed);
        }
    });
});
