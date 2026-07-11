/**
 * @refactor RF-006, RF-007 (infrastructure)
 * @waves W0(advance)/W2(close RF-006)/W3(close RF-007)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-006
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-007
 * @see REFACTOR-MAP.md
 *
 * NotificationPort — contract for user-facing notifications.
 *
 * Fixes 8 violations total:
 *   - 5 domain→ui (services importing Toast component)  → RF-006
 *   - 3 state→ui  (store slices importing Toast component) → RF-007
 *
 * One port for both — the notification boundary is the same regardless
 * of which layer calls it.
 *
 * The NotificationAdapter is the ONLY adapter allowed to import a
 * component (Toast). It is a leaf UI primitive with no domain knowledge.
 */

export interface NotificationPort {
  /** Show a success toast. */
  success(msg: string): void;

  /** Show an error toast. */
  error(msg: string): void;

  /** Show a warning toast. */
  warning(msg: string): void;

  /** Show an informational toast. */
  info(msg: string): void;
}

export const notificationPort: NotificationPort = {
  success: () => throwNotWired('NotificationPort.success'),
  error: () => throwNotWired('NotificationPort.error'),
  warning: () => throwNotWired('NotificationPort.warning'),
  info: () => throwNotWired('NotificationPort.info'),
};

export function wireNotifications(impl: NotificationPort): void {
  Object.assign(notificationPort, impl);
}

function throwNotWired(method: string): never {
  throw new Error(
    `${method} called before wireNotifications(). ` +
    `Ensure wireAllAdapters() runs in main.tsx before React mounts.`
  );
}
