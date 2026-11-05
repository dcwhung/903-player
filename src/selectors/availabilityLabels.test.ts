import {
    dayWhen,
    removalWhen,
    releaseWhen,
    spokenRelease,
    spokenRemoval,
} from './availabilityLabels';

const TODAY = '2026-11-05';

describe('spoken dates (E1)', () => {
    it('should read the date and weekday, never 明日 / 後日', () => {
        expect(spokenRelease('2026-11-06')).toBe('06/11 星期五 上架');
        expect(spokenRemoval('2026-12-05')).toBe('05/12 星期六 下架');
    });
});

describe('availability date labels (F3)', () => {
    it('should write the date when far away, short and long', () => {
        expect(releaseWhen('2026-11-12', TODAY, 'short')).toBe('12/11 上架');
        expect(releaseWhen('2026-11-12', TODAY, 'long')).toBe('12/11（四）上架');
        expect(removalWhen('2026-12-05', TODAY, 'short')).toBe('05/12 下架');
        expect(removalWhen('2026-12-05', TODAY, 'long')).toBe('05/12（六）下架');
    });

    it('should say 明日 / 後日 within two days, the same in short and long', () => {
        expect(releaseWhen('2026-11-06', TODAY, 'short')).toBe('明日上架');
        expect(releaseWhen('2026-11-07', TODAY, 'long')).toBe('後日上架');
        expect(removalWhen('2026-11-06', TODAY, 'long')).toBe('明日下架');
        expect(removalWhen('2026-11-07', TODAY, 'short')).toBe('後日下架');
        expect(releaseWhen('2026-11-08', TODAY, 'short')).toBe('08/11 上架');
    });

    it('should give the bare day for tags without a verb', () => {
        expect(dayWhen('2026-12-01', TODAY)).toBe('01/12');
        expect(dayWhen('2026-11-06', TODAY)).toBe('明日');
        expect(dayWhen('2026-11-07', TODAY)).toBe('後日');
    });
});
