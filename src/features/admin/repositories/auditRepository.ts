import {
  createAuditLog,
  getAuditChannel,
  type AuditAction,
} from '../../../services/database/settings.js';

export type { AuditAction };

export const auditRepository = {
  createLog: createAuditLog,
  getAuditChannel,
};
