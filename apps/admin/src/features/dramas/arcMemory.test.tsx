/*
 * 同一套劇轉 tab 記住揀咗嘅短篇（短篇 tab 展開嗰個 ⇄ 排程 tab 揀咗嗰粒 chip）；
 * 換第二套劇重新嚟過；深連結（#arc）明確指定嘅贏記住嗰個
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { fakeData, mockApi } from '../../../tests/renderApp';
import { AdminDataContext } from '../../data/AdminData';
import { ToastProvider } from '../../ui/Toast';
import { DramaEditorPage } from './DramaEditor';

const AUDIO = { host: 'r2', folder: 'x', file: '{no2}.m4a' };

const entry = (name: string, arcs: { id: string; name: string }[]) => ({
    body: {
        definition: {
            name,
            kind: 'series',
            enabled: true,
            addedAt: '2026-10-27',
            audio: AUDIO,
            arcs: arcs.map((arc) => ({ ...arc, episodes: 3 })),
        },
        images: {},
        draft: false,
        updatedAt: 'v1',
    },
    etag: '"v1"',
});

const noSchedule = () => ({ status: 404, body: { error: 'no such schedule' } });

const api = () =>
    mockApi({
        'GET /api/entries/dramas/lancy': () =>
            entry('蘭茜夫人劇場', [
                { id: 'half', name: '戀愛二分一' },
                { id: 'camp', name: '大衛營' },
                { id: 'fantasy', name: '森美幻想劇' },
            ]),
        'GET /api/entries/dramas/other': () =>
            entry('另一套', [
                { id: 'first', name: '第一個' },
                { id: 'second', name: '第二個' },
            ]),
        'GET /api/dramas/lancy/arcs/half/schedule': noSchedule,
        'GET /api/dramas/lancy/arcs/camp/schedule': noSchedule,
        'GET /api/dramas/lancy/arcs/fantasy/schedule': noSchedule,
        'GET /api/dramas/other/arcs/first/schedule': noSchedule,
        'GET /api/dramas/other/arcs/second/schedule': noSchedule,
    });

function Where() {
    const { pathname, hash } = useLocation();
    return <output data-testid="location">{`${pathname}${hash}`}</output>;
}

function Back() {
    const navigate = useNavigate();
    return (
        <button type="button" onClick={() => void navigate(-1)}>
            上一頁
        </button>
    );
}

/** url 前面加一頁 /start：撳「上一頁」睇吓 history 有冇多咗嘢 */
const renderEditor = (url: string) =>
    render(
        <AdminDataContext.Provider value={fakeData()}>
            <ToastProvider>
                <MemoryRouter initialEntries={['/start', url]} initialIndex={1}>
                    <Back />
                    <Link to="/dramas/other/schedule">去另一套</Link>
                    <Link to="/dramas/lancy/schedule">返蘭茜</Link>
                    <Link to="/dramas/lancy/schedule#fantasy">深連結森美幻想劇</Link>
                    <Routes>
                        <Route path="/start" element={<p>start page</p>} />
                        <Route path="/dramas/:id" element={<DramaEditorPage tab="basic" />} />
                        <Route path="/dramas/:id/arcs" element={<DramaEditorPage tab="arcs" />} />
                        <Route
                            path="/dramas/:id/schedule"
                            element={<DramaEditorPage tab="schedule" />}
                        />
                    </Routes>
                    <Where />
                </MemoryRouter>
            </ToastProvider>
        </AdminDataContext.Provider>,
    );

const tab = (name: string) => screen.getByRole('link', { name });
const chip = (name: RegExp) => screen.findByRole('tab', { name });
const openArcName = () => screen.getByRole('textbox', { name: /^名稱/ });

describe('arc memory across the drama tabs', () => {
    const scrolled: Element[] = [];
    beforeEach(() => {
        scrolled.length = 0;
        Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
            scrolled.push(this);
        };
    });

    it('should select the arc expanded in 短篇 when 排程 opens', async () => {
        api();
        renderEditor('/dramas/lancy/arcs');
        await userEvent.click(await screen.findByRole('button', { name: '展開「大衛營」' }));
        await userEvent.click(tab('排程'));
        expect(await chip(/大衛營/)).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: /戀愛二分一/ })).toHaveAttribute(
            'aria-selected',
            'false',
        );
        // 記住嘅短篇寫入 URL（#arc），重新整理 / 分享都係同一個
        expect(screen.getByTestId('location')).toHaveTextContent(
            /^\/dramas\/lancy\/schedule#camp$/,
        );
    });

    it('should expand and scroll to the chip picked in 排程 when 短篇 opens', async () => {
        api();
        renderEditor('/dramas/lancy/schedule');
        await userEvent.click(await chip(/森美幻想劇/));
        await userEvent.click(tab('短篇（3）'));
        expect(await screen.findByRole('textbox', { name: /^名稱/ })).toHaveValue('森美幻想劇');
        expect(screen.getByRole('button', { name: '展開「森美幻想劇」' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(scrolled.map((el) => el.id)).toContain('fantasy');
    });

    it('should scroll again to the arc after 短篇 → 排程 → 短篇 with the same hash (W-717)', async () => {
        api();
        renderEditor('/dramas/lancy/arcs');
        await userEvent.click(await screen.findByRole('button', { name: '展開「森美幻想劇」' }));
        await userEvent.click(tab('排程'));
        await chip(/森美幻想劇/);
        scrolled.length = 0;
        await userEvent.click(tab('短篇（3）'));
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy\/arcs#fantasy$/);
        expect(await screen.findByRole('textbox', { name: /^名稱/ })).toHaveValue('森美幻想劇');
        expect(scrolled.map((el) => el.id)).toContain('fantasy');
    });

    it('should write the picked chip into the URL, without scrolling or history entries (S-846)', async () => {
        api();
        renderEditor('/dramas/lancy/schedule');
        await userEvent.click(await chip(/大衛營/));
        expect(screen.getByTestId('location')).toHaveTextContent(
            /^\/dramas\/lancy\/schedule#camp$/,
        );
        await userEvent.click(screen.getByRole('tab', { name: /森美幻想劇/ }));
        expect(screen.getByTestId('location')).toHaveTextContent(
            /^\/dramas\/lancy\/schedule#fantasy$/,
        );
        expect(screen.getByRole('tab', { name: /森美幻想劇/ })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(scrolled).toEqual([]);
        // replace，唔係 push：上一頁直接返去入嚟之前嗰頁
        await userEvent.click(screen.getByRole('button', { name: '上一頁' }));
        expect(screen.getByText('start page')).toBeInTheDocument();
    });

    it('should write the expanded arc into the URL without making its row jump (S-846)', async () => {
        api();
        renderEditor('/dramas/lancy/arcs');
        await userEvent.click(await screen.findByRole('button', { name: '展開「大衛營」' }));
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy\/arcs#camp$/);
        expect(openArcName()).toHaveValue('大衛營');
        expect(scrolled).toEqual([]);
        await userEvent.click(screen.getByRole('button', { name: '展開「森美幻想劇」' }));
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy\/arcs#fantasy$/);
        expect(scrolled).toEqual([]);
        await userEvent.click(screen.getByRole('button', { name: '上一頁' }));
        expect(screen.getByText('start page')).toBeInTheDocument();
    });

    it('should keep the arc through 基本資料 and follow the latest pick', async () => {
        api();
        renderEditor('/dramas/lancy/arcs#half');
        expect(await screen.findByRole('textbox', { name: /^名稱/ })).toHaveValue('戀愛二分一');
        await userEvent.click(screen.getByRole('button', { name: '展開「大衛營」' }));
        expect(openArcName()).toHaveValue('大衛營');
        await userEvent.click(tab('基本資料'));
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/dramas\/lancy$/);
        await userEvent.click(tab('排程'));
        expect(await chip(/大衛營/)).toHaveAttribute('aria-selected', 'true');
    });

    it('should start fresh when another drama opens', async () => {
        api();
        renderEditor('/dramas/lancy/schedule');
        await userEvent.click(await chip(/森美幻想劇/));
        await userEvent.click(screen.getByRole('link', { name: '去另一套' }));
        expect(await chip(/第一個/)).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(screen.getByRole('link', { name: '返蘭茜' }));
        expect(await chip(/戀愛二分一/)).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: /森美幻想劇/ })).toHaveAttribute(
            'aria-selected',
            'false',
        );
    });

    it('should let a deep link to an arc win over the remembered one', async () => {
        api();
        renderEditor('/dramas/lancy/arcs');
        await userEvent.click(await screen.findByRole('button', { name: '展開「大衛營」' }));
        await userEvent.click(screen.getByRole('link', { name: '深連結森美幻想劇' }));
        expect(await chip(/森美幻想劇/)).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(tab('短篇（3）'));
        expect(await screen.findByRole('textbox', { name: /^名稱/ })).toHaveValue('森美幻想劇');
    });

    it('should not put a non-arc hash (#images) into the tab links', async () => {
        api();
        renderEditor('/dramas/lancy#images');
        await screen.findByRole('link', { name: '排程' });
        expect(tab('排程')).toHaveAttribute('href', '/dramas/lancy/schedule');
        expect(tab('短篇（3）')).toHaveAttribute('href', '/dramas/lancy/arcs');
    });
});
