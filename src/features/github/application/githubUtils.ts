import type { Locale } from '../../../locales/types.js';
import { t } from '../../../locales/index.js';
import { logger } from '../../../utils/logger.js';

/**
 * Convert GitHub API errors to user-friendly messages
 */
export function handleApiError(error: unknown, locale: Locale): string {
  logger.error(
    'GitHub API error:',
    error instanceof Error ? error.message : error
  );

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 404) return t('github.errors.notFound', locale);
    if (status === 403) return t('github.errors.forbidden', locale);
    if (status === 422) return t('github.errors.conflict', locale);
  }
  return error instanceof Error ? error.message : String(error);
}
