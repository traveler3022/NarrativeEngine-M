/**
 * uiToastAdapter — bridges the UI's toast store to the NotificationPort.
 *
 * This is the *only* file allowed to import both:
 *   - `src/ports/notification`  (the contract logic depends on)
 *   - `src/components/Toast`    (the UI implementation)
 *
 * Wiring happens in `main.tsx` after the toast store exists:
 *
 *     registerNotificationSink(uiToastAdapter);
 *
 * After that call, every `notify.error('…')` from a service or store
 * slice is forwarded to `toast.error('…')` — same UI behaviour as
 * before, but without the import-direction leak.
 */

import { toast } from '../components/Toast';
import { registerNotificationSink, type NotificationSink } from '../ports/notification';

export const uiToastAdapter: NotificationSink = {
    success: (msg) => toast.success(msg),
    error:   (msg) => toast.error(msg),
    warning: (msg) => toast.warning(msg),
    info:    (msg) => toast.info(msg),
};

/** Convenience for `main.tsx` — registers the adapter in one call. */
export function wireNotifications(): void {
    registerNotificationSink(uiToastAdapter);
}
