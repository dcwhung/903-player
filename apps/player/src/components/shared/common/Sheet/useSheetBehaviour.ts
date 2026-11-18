import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { trapTab } from './sheetFocusTrap';
import { useSheetDrag } from './useSheetDrag';

/** 打開前嘅焦點靠唔住（冇 / <body> / 已經唔喺 DOM）：自動開（例如由「我的收藏」入頁）冇撳過掣 */
const isUsableOpener = (el: HTMLElement | null): el is HTMLElement =>
    el !== null && el !== document.body && el.isConnected;

/** 收埋之後焦點去邊：打開前嗰粒掣；靠唔住就 fallback（閂嗰刻先讀 ref，嗰陣掣一定喺 DOM） */
const restoreFocus = (
    opener: HTMLElement | null,
    fallback: RefObject<HTMLElement | null> | undefined,
) => {
    const target = isUsableOpener(opener) ? opener : fallback?.current;
    target?.focus?.({ preventScroll: true });
};

type InputModality = 'keyboard' | 'pointer' | null;

/**
 * C-025：開住期間記低最後一下輸入（capture，表入面 stopPropagation 都收到）。
 * 用戶只接受鍵盤閂見到入口掣嘅 focus ring；自動開時 script focus 張表，Chromium 當佢
 * :focus-visible，撳遮罩 / 拉閂（撳嘅都唔可 focus）再用 script 搬焦點，ring 會沿用落入口掣
 */
const trackInputModality = () => {
    let last: InputModality = null;
    const onKey = () => {
        last = 'keyboard';
    };
    const onPointer = () => {
        last = 'pointer';
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return {
        isKeyboard: () => last === 'keyboard',
        stop: () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('pointerdown', onPointer, true);
        },
    };
};

/** 開住先掛（閂咗、包括滑走緊都唔困 Tab）：Escape 收埋；Tab 困喺表入面 */
const sheetKeyHandler =
    (sheetRef: RefObject<HTMLElement | null>, onCloseRef: RefObject<() => void>) =>
    (event: KeyboardEvent) => {
        if (event.key === 'Escape') onCloseRef.current();
        trapTab(event, sheetRef.current);
    };

/**
 * 打開時焦點入表；Tab 困喺表入面（aria-modal 先困，見 sheetFocusTrap）；Escape 收埋；
 * 收埋之後焦點返去打開前嗰粒掣。
 * W-795：打開前冇焦點（自動開）就返 returnFocusTo（例如頁頭清單掣），唔好跌去 <body>；
 * C-025：只限鍵盤閂；滑鼠 / 觸控閂唔搬焦點（焦點留喺 <body>，冇 ring）
 */
const useSheetFocus = (
    open: boolean,
    onClose: () => void,
    returnFocusTo: RefObject<HTMLElement | null> | undefined,
) => {
    const sheetRef = useRef<HTMLElement>(null);
    // W-747：onClose 用 ref（同 useCloseTimer 一樣）；caller 每次 render 傳新 function，
    // 播放時每秒 re-render 唔可以重跑 effect，否則 cleanup 將焦點由 sheet 入面扯走
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement as HTMLElement | null;
        // 表由畫面底下面滑上嚟（SheetMotion sheet-in）：focus 嗰刻仲喺畫面外，預設會捲祖先
        // （連 overflow: hidden 嘅 main）去露出佢，手機打橫成頁彈上再彈落；開 / 閂都唔准捲
        sheetRef.current?.focus({ preventScroll: true });
        const onKey = sheetKeyHandler(sheetRef, onCloseRef);
        document.addEventListener('keydown', onKey);
        const modality = trackInputModality();
        return () => {
            document.removeEventListener('keydown', onKey);
            modality.stop();
            restoreFocus(opener, modality.isKeyboard() ? returnFocusTo : undefined);
        };
        // returnFocusTo 係 useRef 物件（穩定），放入 deps 都唔會令 effect 重跑
    }, [open, returnFocusTo]);
    return sheetRef;
};

/**
 * 焦點（useSheetFocus）同向下拉閂（useSheetDrag）共用同一張表：
 * 穩定嘅 callback ref 同時填兩邊，唔會每次 render（播放時間每秒更新）重掛。
 * returnFocusTo 可選：唔傳就行為不變
 */
export const useSheetBehaviour = (
    open: boolean,
    onClose: () => void,
    returnFocusTo?: RefObject<HTMLElement | null>,
) => {
    const sheetRef = useSheetFocus(open, onClose, returnFocusTo);
    const { sheetRef: bindSheet, ...drag } = useSheetDrag(open, onClose);
    const setSheet = useCallback(
        (el: HTMLElement | null) => {
            sheetRef.current = el;
            bindSheet(el);
        },
        [sheetRef, bindSheet],
    );
    return { setSheet, ...drag };
};
