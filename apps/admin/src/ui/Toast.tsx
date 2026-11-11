/* 短暫提示（例如「已更新次序」）：aria-live polite，幾秒後自動消失 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const TOAST_MS = 2400;

const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState<{ text: string; key: number } | null>(null);
    const show = useCallback((text: string) => setMessage({ text, key: Date.now() }), []);
    useEffect(() => {
        if (!message) return undefined;
        const timer = setTimeout(() => setMessage(null), TOAST_MS);
        return () => clearTimeout(timer);
    }, [message]);
    return (
        <ToastContext.Provider value={show}>
            {children}
            <div className="toast-region" role="status" aria-live="polite">
                {message && (
                    <span key={message.key} className="toast">
                        {message.text}
                    </span>
                )}
            </div>
        </ToastContext.Provider>
    );
}
