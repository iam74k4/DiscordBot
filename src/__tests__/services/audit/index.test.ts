import { describe, expect, it } from 'vitest';
import { formatAuditTarget } from '../../../services/audit/format.js';

describe('audit helpers', () => {
  describe('formatAuditTarget', () => {
    it('formats audit setup targets as channel mentions', () => {
      expect(formatAuditTarget('AUDIT_SETUP', '123456')).toBe('<#123456>');
    });

    it('formats non-channel targets as user mentions', () => {
      expect(formatAuditTarget('SETTINGS_CHANGE', '123456')).toBe('<@123456>');
    });

    it('returns null when target is absent', () => {
      expect(formatAuditTarget('AUDIT_SETUP', null)).toBeNull();
    });
  });
});
