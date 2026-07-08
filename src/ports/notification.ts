/**
 * NotificationPort — the seam between domain/services/store and the UI.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * Before this port, services and store slices imported `toast` directly
 * from `src/components/Toast.tsx`. That made the dependency graph point
 * the wrong way: the inner layer (logic) knew about the outer layer
 * (presentation). Once that arrow exists, every refactor of the toast
 * component risks breaking the LLM call pipeline, the image generator,
 * the campaign save path, and three store slices — because they all
 * hold a direct import to it.
 *
 * This port flips the arrow. Logic layers depend on the *contract*
 * (NotificationPort), not the implementation. The UI registers itself
 * as the implementation at startup; until then calls are buffered so
 * nothing is lost during boot.
 *
 * ── Layer rule ──────────────────────────────────────────────────────────
 *   services/*   →  may import ports/notification  ✓
 *   store/*      →  may import ports/notification  ✓
 *   components/* →  must NOT be imported by the above
 *
 * The only file that knows about both sides is `adapters/uiToastAdapter.ts`,
 * wired from `main.tsx` once React is up.
 */

export type NotificationLevel = 'success' | 'error' | 'warning' | 'info';

export interface NotificationSink {
    success(msg: string): void;
    error(msg: string): void;
    warning(msg: string): void;
    info(msg: string): void;
}

/**
 * No-op sink used until the UI registers its real adapter. We don't drop
 * the call silently — we buffer it so a fast startup event still surfaces
 * once the toast container mounts. The buffer is bounded; if it overflows
 * we drop the oldest, since these are best-effort UX notifications and
 * not audit logs.
 */
const BUFFER_LIMIT = 16;
const pending: Array<{ level: NotificationLevel; msg: string }> = [];
let sink: NotificationSink | null = null;

function forward(level: NotificationLevel, msg: string) {
    if (sink) {
        sink[level](msg);
        return;
    }
    if (pending.length >= BUFFER_LIMIT) pending.shift();
    pending.push({ level, msg });
}

function flush() {
    if (!sink) return;
    while (pending.length) {
        const { level, msg } = pending.shift()!;
        sink[level](msg);
    }
}

/**
 * Called once by the UI bootstrap (main.tsx) to wire the real toast
 * container as the implementation. Any buffered notifications are
 * flushed immediately.
 */
export function registerNotificationSink(s: NotificationSink): void {
    sink = s;
    flush();
}

/**
 * The contract callers depend on. Logic layers import this object
 * (not the component, not the store) to surface user-visible messages.
 */
export const notify: NotificationSink = {
    success: (msg) => forward('success', msg),
    error:   (msg) => forward('error', msg),
    warning: (msg) => forward('warning', msg),
    info:    (msg) => forward('info', msg),
};
