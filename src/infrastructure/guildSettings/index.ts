import { database } from '../database/connection.js';
import { getErrorMessage, logger } from '../../shared/utils/logger.js';

/**
 * Per-guild configuration shared by several features.
 *
 * This lives in infrastructure rather than a feature because three unrelated
 * consumers read it: locale resolution (`language`), the audit service
 * (`audit_channel_id`), owner broadcasts (`announcement_channel_id`), and
 * voice auto-join (`voice_autojoin_enabled`).
 * Owning it here keeps exactly one place that writes the table - previously
 * admin, voice, and audit each issued their own SQL against it.
 */
export interface GuildSettingsRecord {
  guild_id: string;
  /** Configured language, or null when output follows each viewer's locale. */
  language: string | null;
  audit_channel_id: string | null;
  /** Where bot-owner announcements are posted, or null when not opted in. */
  announcement_channel_id: string | null;
  /** 1 while the bot may auto-join voice channels in this guild. */
  voice_autojoin_enabled: number;
  created_at: number;
  updated_at: number;
}

/** Columns callers may write. Anything else is rejected at compile time. */
export type GuildSettingsUpdate = Partial<
  Pick<
    GuildSettingsRecord,
    | 'language'
    | 'audit_channel_id'
    | 'announcement_channel_id'
    | 'voice_autojoin_enabled'
  >
>;

const WRITABLE_COLUMNS = [
  'language',
  'audit_channel_id',
  'announcement_channel_id',
  'voice_autojoin_enabled',
] as const satisfies ReadonlyArray<keyof GuildSettingsUpdate>;

/** Values a row starts with when a caller sets only one field. */
const COLUMN_DEFAULTS: {
  [K in keyof Required<GuildSettingsUpdate>]: GuildSettingsRecord[K];
} = {
  language: null,
  audit_channel_id: null,
  announcement_channel_id: null,
  voice_autojoin_enabled: 1,
};

function get(guildId: string): GuildSettingsRecord | null {
  const row = database
    .prepare('SELECT * FROM guild_settings WHERE guild_id = ?')
    .get(guildId) as GuildSettingsRecord | undefined;
  return row ?? null;
}

/**
 * Create or update a guild's settings.
 *
 * Every write goes through here so no caller has to know the column list.
 * Fields left out of `settings` keep their stored value; on insert they take
 * the documented default, which is why configuring an audit channel never
 * pins a guild to a language it did not choose.
 */
function update(guildId: string, settings: GuildSettingsUpdate): void {
  const now = Date.now();
  const columns = WRITABLE_COLUMNS.filter(
    (column) => settings[column] !== undefined
  );

  if (get(guildId)) {
    if (columns.length === 0) return;

    const assignments = columns.map((column) => `${column} = ?`);
    const values = columns.map((column) => settings[column]!);

    database
      .prepare(
        `UPDATE guild_settings SET ${assignments.join(', ')}, updated_at = ? WHERE guild_id = ?`
      )
      .run(...values, now, guildId);
    return;
  }

  database
    .prepare(
      `INSERT INTO guild_settings (guild_id, ${WRITABLE_COLUMNS.join(', ')}, created_at, updated_at)
       VALUES (?, ${WRITABLE_COLUMNS.map(() => '?').join(', ')}, ?, ?)`
    )
    .run(
      guildId,
      ...WRITABLE_COLUMNS.map(
        (column) => settings[column] ?? COLUMN_DEFAULTS[column]
      ),
      now,
      now
    );
}

/**
 * Configured language, or null when it follows each viewer.
 * Never throws: locale resolution runs on every reply, and a database problem
 * must degrade to the viewer's own language rather than break the reply.
 */
function getLanguage(guildId: string): string | null {
  try {
    return get(guildId)?.language ?? null;
  } catch (error) {
    logger.debug(
      `Failed to read language for guild ${guildId}: ${getErrorMessage(error)}`
    );
    return null;
  }
}

function setLanguage(guildId: string, language: string | null): void {
  update(guildId, { language });
}

function getAuditChannel(guildId: string): string | null {
  return get(guildId)?.audit_channel_id ?? null;
}

function setAuditChannel(guildId: string, channelId: string | null): void {
  update(guildId, { audit_channel_id: channelId });
}

/**
 * Channel this guild accepts bot-owner announcements in, or null.
 *
 * Never throws: a broadcast walks every guild, and one unreadable row must
 * skip that guild rather than abort the run.
 */
function getAnnouncementChannel(guildId: string): string | null {
  try {
    return get(guildId)?.announcement_channel_id ?? null;
  } catch (error) {
    logger.debug(
      `Failed to read announcement channel for guild ${guildId}: ${getErrorMessage(error)}`
    );
    return null;
  }
}

function setAnnouncementChannel(
  guildId: string,
  channelId: string | null
): void {
  update(guildId, { announcement_channel_id: channelId });
}

/**
 * Whether the bot may auto-join voice channels here. Defaults to enabled:
 * a guild with no row has not opted out, and a read failure must not silently
 * change behaviour that existed before the setting did.
 */
function isVoiceAutoJoinEnabled(guildId: string): boolean {
  try {
    const row = get(guildId);
    return row ? row.voice_autojoin_enabled === 1 : true;
  } catch (error) {
    logger.debug(
      `Failed to read voice auto-join for guild ${guildId}: ${getErrorMessage(error)}`
    );
    return true;
  }
}

function setVoiceAutoJoinEnabled(guildId: string, enabled: boolean): void {
  update(guildId, { voice_autojoin_enabled: enabled ? 1 : 0 });
}

export const guildSettingsRepository = {
  get,
  getAnnouncementChannel,
  getAuditChannel,
  getLanguage,
  isVoiceAutoJoinEnabled,
  setAnnouncementChannel,
  setAuditChannel,
  setLanguage,
  setVoiceAutoJoinEnabled,
  update,
};
