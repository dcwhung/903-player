import { fileNameOf, missingSlots, planAutoCrop, slotKey } from './r2AutoCrop';

const SOURCES = {
    folder: '蘭茜夫人劇場',
    cdCover: '蘭茜夫人劇場/cd cover.jpg',
    coverPhoto: '蘭茜夫人劇場/Cover Photo.png',
    arcs: [
        {
            name: '戀愛二分一',
            id: 'half',
            cdCover: null,
            coverPhoto: '蘭茜夫人劇場/戀愛二分一/cover photo.jpg',
        },
        { name: '我心不死', id: 'lancy-02', cdCover: null, coverPhoto: null },
        {
            name: '新資料夾',
            id: null,
            cdCover: '蘭茜夫人劇場/新資料夾/cd cover.jpg',
            coverPhoto: null,
        },
    ],
};

const definition = {
    name: '蘭茜夫人劇場',
    audio: { host: 'r2', folder: '蘭茜夫人劇場' },
    tile: 'tile.webp',
    arcs: [
        { id: 'half', name: '戀愛二分一' },
        { id: 'lancy-02', name: '我心不死' },
    ],
};

describe('missingSlots', () => {
    it('should list every drama / arc slot without an uploaded image', () => {
        expect(missingSlots(definition, { 'tile.webp': 'a.webp' })).toEqual([
            slotKey('disc'),
            slotKey('tile', 'half'),
            slotKey('disc', 'half'),
            slotKey('tile', 'lancy-02'),
            slotKey('disc', 'lancy-02'),
        ]);
    });

    it('should count a slot whose file is not uploaded yet as missing', () => {
        expect(missingSlots(definition, {})).toContain(slotKey('tile'));
    });
});

describe('planAutoCrop', () => {
    it('should crop the disc from cd cover and the tile from cover photo, skipping filled slots', () => {
        const jobs = planAutoCrop(definition, { 'tile.webp': 'a.webp' }, SOURCES);
        expect(jobs).toEqual([
            { key: slotKey('disc'), slot: 'disc', sourceKey: '蘭茜夫人劇場/cd cover.jpg' },
            {
                key: slotKey('tile', 'half'),
                slot: 'tile',
                arcId: 'half',
                sourceKey: '蘭茜夫人劇場/戀愛二分一/cover photo.jpg',
            },
            {
                key: slotKey('disc', 'half'),
                slot: 'disc',
                arcId: 'half',
                sourceKey: '蘭茜夫人劇場/戀愛二分一/cover photo.jpg',
            },
        ]);
    });

    it('should use cover photo for the disc when there is no cd cover', () => {
        const jobs = planAutoCrop({ name: 'x' }, {}, { ...SOURCES, cdCover: null, arcs: [] });
        expect(jobs.find((job) => job.slot === 'disc')?.sourceKey).toBe(
            '蘭茜夫人劇場/Cover Photo.png',
        );
    });

    it('should plan nothing for arcs the definition does not know', () => {
        const jobs = planAutoCrop({ name: 'x', disc: 'd', tile: 't' }, { d: '1', t: '2' }, SOURCES);
        expect(jobs).toEqual([]);
    });
});

describe('fileNameOf', () => {
    it('should show only the file name of an R2 key', () => {
        expect(fileNameOf('蘭茜夫人劇場/戀愛二分一/cover photo.jpg')).toBe('cover photo.jpg');
    });
});
