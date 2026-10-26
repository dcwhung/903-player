import { bundledSource } from './bundledSource';

describe('bundledSource', () => {
    it('finds one folder per drama.json, each with its images keyed by file name', () => {
        const folders = bundledSource.folders();
        folders.forEach((folder) => {
            expect(folder.source).toBe(`src/dramas/${folder.id}/drama.json`);
            expect(typeof folder.definition).toBe('object');
            Object.entries(folder.images).forEach(([file, url]) => {
                expect(file).toMatch(/\.webp$/);
                expect(url).toContain(`/${folder.id}/`);
            });
        });
    });
});
