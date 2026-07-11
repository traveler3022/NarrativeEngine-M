/**
 * @refactor RF-006, RF-007 (infrastructure)
 * @waves W0(advance)/W2(close RF-006)/W3(close RF-007)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-006
 * @see ../ports/NotificationPort.ts
 *
 * NotificationAdapter — thin delegate from NotificationPort to the Toast component.
 *
 * This is the ONLY adapter allowed to import a component (Toast).
 * Toast is a leaf UI primitive with no domain knowledge — it's a
 * rendering primitive, not a domain module. (Per 2.6 Adapter Design,
 * NotificationAdapter exception.)
 */

import { toast } from '../components/Toast';
import type { NotificationPort } from '../ports/NotificationPort';

export function createNotificationAdapter(): NotificationPort {
  return {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    warning: (msg) => toast.warning(msg),
    info: (msg) => toast.info(msg),
  };
}
