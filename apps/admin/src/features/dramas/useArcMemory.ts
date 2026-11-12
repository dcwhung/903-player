/*
 * 同一套劇轉 tab 記住揀咗嘅短篇：短篇 tab 展開嗰個 ⇄ 排程 tab 揀咗嗰粒 chip。
 * 狀態放喺 DramaEditor（key = 劇 ID，換劇自動重新嚟過）；轉 tab 嘅連結帶 #<短篇 ID>，
 * 沿用 useHashTarget（短篇 tab 捲去嗰行）同深連結（/dramas/:id/arcs#arc、/schedule#arc）。
 * 深連結 / 待辦帶嚟嘅 #arc 一定贏記住嗰個；#folder / #images 呢啲唔係短篇嘅 hash 唔理。
 * 揀嘅時候用 replace 寫入 URL hash（重新整理揀返同一個、上一頁唔會逐粒 chip 行返轉頭），
 * 標做 quiet：useHashTarget 唔捲（S-846）
 */
import { useRef, useState, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface ArcMemory {
    /** 記住嘅短篇 ID（唔係呢套劇嘅短篇就係 ''） */
    arc: string;
    remember: (arcId: string) => void;
    /** 交畀 useHashTarget：自己寫入嘅 hash 唔捲 */
    quietRef: RefObject<string | null>;
}

export const useArcMemory = (hash: string, arcIds: readonly string[]): ArcMemory => {
    const [picked, setPicked] = useState(hash);
    const [seenHash, setSeenHash] = useState(hash);
    const quietRef = useRef<string | null>(null);
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    // hash 變咗（深連結 / 轉 tab）：係短篇就以佢為準（render 期間更新，tab 第一次 render 已經用新值）
    if (hash !== seenHash) {
        setSeenHash(hash);
        if (arcIds.includes(hash)) setPicked(hash);
    }
    const remember = (arcId: string) => {
        setPicked(arcId);
        if (arcId === hash) return;
        quietRef.current = arcId;
        void navigate(
            { pathname, search, hash: `#${encodeURIComponent(arcId)}` },
            { replace: true },
        );
    };
    return { arc: arcIds.includes(picked) ? picked : '', remember, quietRef };
};
