import { mockApi } from '../../tests/renderApp';
import {
    deleteBrandingIcon,
    deleteBrandingText,
    getBranding,
    getDeployStatus,
    putBrandingIcon,
    putBrandingText,
    redeploy,
} from './brandingEndpoints';
import { uploadAsset } from './endpoints';

const ICON = {
    favicon: 'a.png',
    appleTouch: 'b.png',
    icon192: 'c.png',
    icon512: 'd.png',
    maskable: 'e.png',
    maskableBackground: '#0b0b0b',
};

describe('branding endpoints', () => {
    it('should read, write and restore the icon and the text', async () => {
        const branding = { icon: ICON, text: null, updatedAt: 'x' };
        const api = mockApi({
            'GET /api/branding': () => ({ body: branding }),
            'PUT /api/branding/icon': () => ({ body: branding }),
            'DELETE /api/branding/icon': () => ({}),
            'PUT /api/branding/text': () => ({ body: branding }),
            'DELETE /api/branding/text': () => ({}),
        });
        expect(await getBranding()).toEqual(branding);
        expect(await putBrandingIcon(ICON)).toEqual(branding);
        await putBrandingText({ name: 'A', shortName: null, description: 'B' });
        await deleteBrandingIcon();
        await deleteBrandingText();
        const bodies = api.mock.calls.map(([, init]) => init?.body);
        expect(bodies[1]).toBe(JSON.stringify(ICON));
        expect(bodies[2]).toBe('{"name":"A","shortName":null,"description":"B"}');
    });

    it('should read the deploy status and redeploy one publish', async () => {
        mockApi({
            'GET /api/publishes/7/deploy': () => ({ body: { status: 'in_progress', url: 'u' } }),
            'POST /api/publishes/7/deploy': () => ({
                body: { deploy: 'triggered', deployRequestedAt: 't' },
            }),
        });
        expect(await getDeployStatus(7)).toEqual({ status: 'in_progress', url: 'u' });
        expect(await redeploy(7)).toEqual({ deploy: 'triggered', deployRequestedAt: 't' });
    });

    it('should upload PNG icons with an image/png content type', async () => {
        const api = mockApi({ 'PUT /api/assets': () => ({ body: { name: 'f.png' } }) });
        await uploadAsset(new Blob(['x'], { type: 'image/png' }), 'image/png');
        await uploadAsset(new Blob(['x'], { type: 'image/webp' }));
        const types = api.mock.calls.map(([, init]) =>
            new Headers(init?.headers).get('content-type'),
        );
        expect(types).toEqual(['image/png', 'image/webp']);
    });
});
