/**
 * Compatibility marker for the Steam feature removal.
 *
 * Migrations are replayed on every fresh database and have no persisted
 * migration ledger, so dropping these tables here would permanently erase
 * legacy Steam registrations/history on upgrade and again after backup
 * restores. Keep the tables intact for rollback/export even though runtime
 * code no longer writes to them.
 */
export function up(): void {}
