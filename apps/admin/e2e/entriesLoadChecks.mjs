// Admin e2e section：全部 entry 一個 request 讀晒（GET /api/entries?detail=1，AU-024），唔再逐個 GET
// 由 run.mjs 傳入共用 helper（check / newPage / loggedIn / BASE），回返 check function 清單

const DETAIL_REQUEST = 'GET /api/entries?detail=1';
const SINGLE_ENTRY_GET = /^GET \/api\/entries\/(shows|dramas)\/[^/?]+$/;

export const entriesLoadChecks = ({ check, newPage, loggedIn, BASE }) => {
    const oneRequestCheck = (browser) =>
        check('entries: the lists load every entry with one detail request', async () => {
            const state = loggedIn();
            const page = await newPage(browser, state);
            const requests = [];
            page.on('request', (request) => {
                const url = new URL(request.url());
                requests.push(`${request.method()} ${url.pathname}${url.search}`);
            });
            await page.goto(`${BASE}/dramas`);
            const first = state.entries.find((entry) => entry.kind === 'dramas');
            await page.getByRole('link', { name: first.definition.name, exact: true }).waitFor();
            const detail = requests.filter((request) => request === DETAIL_REQUEST);
            if (detail.length !== 1)
                throw new Error(`detail list requests: ${detail.length} (${requests.join(', ')})`);
            const single = requests.filter((request) => SINGLE_ENTRY_GET.test(request));
            if (single.length > 0) throw new Error(`per-entry GETs: ${single.join(', ')}`);
            await page.close();
        });

    return [oneRequestCheck];
};
