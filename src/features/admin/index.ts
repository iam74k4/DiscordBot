export const name = 'admin';

/**
 * Start Admin feature.
 * Audit log retention is scheduled by the audit service that owns the table.
 */
export function start(): void {
  // Admin commands do not require background startup work.
}

/**
 * Stop Admin feature
 */
export function stop(): void {
  // Admin commands do not require shutdown work.
}
