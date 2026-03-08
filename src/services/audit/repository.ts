import {
  createAuditLog,
  getAuditChannel,
  type AuditAction,
} from '../database/settings.js';

export type { AuditAction };

export const auditRepository = {
  createLog: createAuditLog,
  getAuditChannel,
};
