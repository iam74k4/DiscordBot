/**
 * Format audit target mention by action type
 */
export function formatAuditTarget(
  action: string,
  targetId: string | null | undefined
): string | null {
  if (!targetId) {
    return null;
  }

  if (action === 'AUDIT_SETUP') {
    return `<#${targetId}>`;
  }

  return `<@${targetId}>`;
}
