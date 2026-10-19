import { hasAllowedAudioOrigin, isRecording } from './recordingValidation';

const VALID = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/a.aac',
};

describe('hasAllowedAudioOrigin', () => {
    it('accepts only the archive audio host', () => {
        expect(hasAllowedAudioOrigin(VALID.url)).toBe(true);
        expect(hasAllowedAudioOrigin('https://audio.hkfm903.live.evil.com/a.aac')).toBe(false);
        expect(hasAllowedAudioOrigin('not a url')).toBe(false);
    });
});

describe('isRecording', () => {
    it.each([
        ['valid', VALID, true],
        ['unknown show', { ...VALID, showId: 'x' }, false],
        ['bad date', { ...VALID, date: '17/10/2026' }, false],
        ['bad time', { ...VALID, time: '23:08' }, false],
        ['foreign url', { ...VALID, url: 'https://evil.example.com/a.aac' }, false],
        ['null', null, false],
    ])('%s', (_, value, expected) => {
        expect(isRecording(value)).toBe(expected);
    });
});
