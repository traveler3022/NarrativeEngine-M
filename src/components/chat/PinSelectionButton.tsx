import { useState, useEffect, useRef, useCallback } from 'react';
import { Pin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../Toast';

type ButtonPos = { top: number; left: number };

/**
 * Global floating "Pin selection" button.
 * Mount once inside the chat scroll container.
 * Listens to selectionchange and positions itself above the selected text when
 * the selection is non-empty and fully contained within a single message bubble
 * (identified by the nearest [data-message-id] ancestor).
 */
export function PinSelectionButton() {
    const [pos, setPos] = useState<ButtonPos | null>(null);
    const [messageId, setMessageId] = useState<string | null>(null);
    const rafRef = useRef<number | null>(null);
    const addPinnedExcerpt = useAppStore(s => s.addPinnedExcerpt);

    /** Walk up from a node to find the nearest element with data-message-id. */
    const getMessageId = (node: Node | null): string | null => {
        let el: Element | null = node?.nodeType === 1
            ? (node as Element)
            : node?.parentElement ?? null;
        while (el) {
            const id = (el as HTMLElement).dataset?.messageId;
            if (id) return id;
            el = el.parentElement;
        }
        return null;
    };

    const handleSelectionChange = useCallback(() => {
        // Coalesce with rAF — selectionchange fires very frequently during drag
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                setPos(null);
                setMessageId(null);
                return;
            }

            const range = sel.getRangeAt(0);
            const anchorId = getMessageId(sel.anchorNode);
            const focusId = getMessageId(sel.focusNode);

            // Require both ends of the selection to be inside the same message bubble
            if (!anchorId || !focusId || anchorId !== focusId) {
                setPos(null);
                setMessageId(null);
                return;
            }

            const rect = range.getBoundingClientRect();
            if (!rect || (rect.width === 0 && rect.height === 0)) {
                setPos(null);
                setMessageId(null);
                return;
            }

            // Position the button centred above the selection, accounting for scroll
            const scrollY = window.scrollY ?? document.documentElement.scrollTop;
            const scrollX = window.scrollX ?? document.documentElement.scrollLeft;
            setPos({
                top: rect.top + scrollY - 36,   // 36px above selection
                left: rect.left + scrollX + rect.width / 2,
            });
            setMessageId(anchorId);
        });
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [handleSelectionChange]);

    const handlePin = () => {
        const sel = window.getSelection();
        if (!sel || !messageId) return;
        const text = sel.toString().trim();
        if (!text) return;

        const result = addPinnedExcerpt(messageId, text, false);
        if (result.ok) {
            sel.removeAllRanges();
            setPos(null);
            setMessageId(null);
        } else {
            toast.warning(result.reason);
            // Leave selection intact so the player can see what was attempted
        }
    };

    if (!pos) return null;

    return (
        <div
            style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 150 }}
            // Prevent the button itself from clearing the selection when clicked
            onMouseDown={(e) => e.preventDefault()}
        >
            <button
                onClick={handlePin}
                className="flex items-center gap-1.5 px-2 py-1 bg-void-darker border border-terminal/60 text-terminal text-[10px] font-mono uppercase tracking-wider rounded shadow-lg hover:bg-terminal/10 active:scale-95 transition-all whitespace-nowrap"
                title="Pin selected text as a memory excerpt"
            >
                <Pin size={10} />
                Pin selection
            </button>
        </div>
    );
}
