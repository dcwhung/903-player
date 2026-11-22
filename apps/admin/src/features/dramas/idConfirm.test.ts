import { renamedConfirm } from './idConfirm';

describe('renamedConfirm', () => {
    it('should confirm auto-numbered arcs under the ID the server renamed them to (AU-013)', () => {
        expect(
            renamedConfirm(
                { drama: true, arcIds: ['drama-01-01', 'special'] },
                'drama-01',
                'lancy',
            ),
        ).toEqual({ drama: true, arcIds: ['lancy-01', 'special'] });
    });

    it('should keep a confirm without arcs as it is', () => {
        expect(renamedConfirm({ drama: true }, 'drama-01', 'lancy')).toEqual({ drama: true });
        expect(renamedConfirm({}, 'drama-01', 'drama-01')).toEqual({});
    });
});
