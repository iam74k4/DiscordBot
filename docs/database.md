# Database

## Overview

The bot uses **SQLite** via [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3) for data persistence.

- **Journal mode**: WAL (Write-Ahead Logging) for better concurrent read/write performance
- **Path**: Configurable via `DATABASE_PATH` env var; defaults to `data/bot.db` (relative to `process.cwd()`)
- **Location**: On Railway, the database lives under `/app/data` when `DATABASE_PATH` is `data/bot.db` and the project root is `/app`

Feature code should prefer feature-local repositories under `src/features/<feature>/repositories/` instead of importing shared database modules directly. `src/infrastructure/database/` is reserved for DB bootstrap and shared primitives.

---

## Architecture

```
src/infrastructure/database/
├── connection.ts    # Singleton DB connection, WAL mode, path resolution
├── transaction.ts  # runTransaction(fn) — synchronous transaction wrapper
├── migrations/
│   ├── index.ts             # Runs all migrations in order at startup
│   ├── 001_steam.ts         # Legacy Steam tables (kept for upgrade path; dropped by 005)
│   ├── 002_notifications.ts # Legacy Steam notification tables (dropped by 005)
│   ├── 003_settings.ts
│   ├── 004_notification.ts
│   └── 005_drop_steam.ts    # Drops legacy Steam tables on existing databases
└── index.ts        # Public exports
```

- **connection.ts**: Creates the SQLite connection, ensures the data directory exists, and sets `journal_mode = WAL`. Exports `database` and `closeDatabase()`.
- **transaction.ts**: Provides `runTransaction(fn)` to run a synchronous function inside a transaction. Commits on success, rolls back on error. Note: better-sqlite3 transactions do not support async functions.
- **migrations/**: Each migration file exports an `up()` function. Migrations run in order at startup via `initializeDatabase()`.

---

## Schema

### notification_channels

Per-guild notification channels by type.

| Column     | Type    | Constraints        |
| ---------- | ------- | ------------------ |
| guild_id   | TEXT    | NOT NULL           |
| type       | TEXT    | NOT NULL           |
| channel_id | TEXT    | NOT NULL           |
| enabled    | INTEGER | NOT NULL DEFAULT 1 |
| created_at | INTEGER | NOT NULL           |
| updated_at | INTEGER | NOT NULL           |

**Primary key:**

- `(guild_id, type)`

---

### voice_sessions

Per-user VC session history for statistics.

| Column       | Type    | Constraints               |
| ------------ | ------- | ------------------------- |
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT |
| guild_id     | TEXT    | NOT NULL                  |
| user_id      | TEXT    | NOT NULL                  |
| channel_id   | TEXT    | NOT NULL                  |
| channel_name | TEXT    | NOT NULL                  |
| joined_at    | INTEGER | NOT NULL                  |
| left_at      | INTEGER |                           |
| duration_ms  | INTEGER |                           |
| created_at   | INTEGER | NOT NULL                  |

**Indices:**

- `idx_voice_sessions_guild_user` ON `guild_id, user_id`
- `idx_voice_sessions_guild_channel` ON `guild_id, channel_id`
- `idx_voice_sessions_joined_at` ON `joined_at`

---

### guild_settings

Per-guild settings (language, audit channel, voice auto-join).

| Column                 | Type    | Constraints        |
| ---------------------- | ------- | ------------------ |
| guild_id               | TEXT    | PRIMARY KEY        |
| language               | TEXT    | DEFAULT 'ja'       |
| audit_channel_id       | TEXT    |                    |
| voice_autojoin_enabled | INTEGER | NOT NULL DEFAULT 1 |
| created_at             | INTEGER | NOT NULL           |
| updated_at             | INTEGER | NOT NULL           |

`language` NULL means "follow each viewer's Discord client locale" — the `auto`
choice in `/admin settings language`. Rows inserted for other settings leave it
NULL so a guild is never pinned to a language it did not choose.

---

### polls

Open polls and finalize-pending polls. Successful Discord publish deletes the
row (and its votes). When publish fails, `ended=1` keeps the sealed tally so a
restart retries finalize instead of reopening voting.

| Column     | Type    | Constraints           |
| ---------- | ------- | --------------------- |
| message_id | TEXT    | PRIMARY KEY           |
| guild_id   | TEXT    | NOT NULL              |
| channel_id | TEXT    | NOT NULL              |
| creator_id | TEXT    | NOT NULL              |
| question   | TEXT    | NOT NULL              |
| options    | TEXT    | NOT NULL (JSON array) |
| anonymous  | INTEGER | NOT NULL DEFAULT 0    |
| ends_at    | INTEGER |                       |
| locale     | TEXT    | NOT NULL              |
| created_at | INTEGER | NOT NULL              |
| ended      | INTEGER | NOT NULL DEFAULT 0    |

**Indices:**

- `idx_polls_guild_id` ON `guild_id`
- `idx_polls_ends_at` ON `ends_at`

---

### poll_votes

One row per voter per poll; changing a vote updates the row.

| Column       | Type    | Constraints                      |
| ------------ | ------- | -------------------------------- |
| message_id   | TEXT    | NOT NULL, FK → polls(message_id) |
| user_id      | TEXT    | NOT NULL                         |
| option_index | INTEGER | NOT NULL                         |
| voted_at     | INTEGER | NOT NULL                         |

PRIMARY KEY (`message_id`, `user_id`)

---

### voice_autojoin_exclusions

Voice channels the bot must not join or buffer audio in.

| Column     | Type    | Constraints |
| ---------- | ------- | ----------- |
| guild_id   | TEXT    | NOT NULL    |
| channel_id | TEXT    | NOT NULL    |
| created_at | INTEGER | NOT NULL    |

PRIMARY KEY (`guild_id`, `channel_id`)

---

### audit_logs

Audit log entries for admin actions.

| Column     | Type    | Constraints               |
| ---------- | ------- | ------------------------- |
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT |
| guild_id   | TEXT    | NOT NULL                  |
| user_id    | TEXT    | NOT NULL                  |
| action     | TEXT    | NOT NULL                  |
| target_id  | TEXT    |                           |
| details    | TEXT    |                           |
| created_at | INTEGER | NOT NULL                  |

**Indices:**

- `idx_audit_logs_guild_id` ON `guild_id`
- `idx_audit_logs_created_at` ON `created_at`

---

## AuditAction Types

The `action` column in `audit_logs` stores one of these values:

| Value             | Description                   |
| ----------------- | ----------------------------- |
| `NOTIFY_SETUP`    | Notification setup            |
| `NOTIFY_ENABLE`   | Notifications enabled         |
| `NOTIFY_DISABLE`  | Notifications disabled        |
| `NOTIFY_REMOVE`   | Notification settings removed |
| `SETTINGS_CHANGE` | Guild settings changed        |
| `AUDIT_SETUP`     | Audit log channel configured  |
| `ROLE_ADD`        | Role granted to a member      |
| `ROLE_REMOVE`     | Role removed from a member    |

Defined in `src/features/admin/repositories/auditRepository.ts`.

---

## Repository Ownership

| Tables                                | Feature        | Repositories                                                    |
| ------------------------------------- | -------------- | --------------------------------------------------------------- |
| notification_channels, voice_sessions | notification   | `notificationChannelRepository.ts`, `voiceSessionRepository.ts` |
| guild_settings                        | infrastructure | `infrastructure/guildSettings/index.ts`                         |
| audit_logs                            | infrastructure | `infrastructure/audit/auditRepository.ts`                       |
| polls, poll_votes                     | community      | `poll/pollRepository.ts`                                        |
| voice_autojoin_exclusions             | voice          | `repositories/voiceSettingsRepository.ts`                       |

`guild_settings` and `audit_logs` are owned by infrastructure rather than a
feature because several features read them: locale resolution reads
`language`, the audit service reads `audit_channel_id`, and voice reads
`voice_autojoin_enabled`. Every write to `guild_settings` goes through
`guildSettingsRepository.update()`, which is enforced by
`src/__tests__/architecture.test.ts`.

All repositories live under `src/features/<feature>/repositories/`.

---

## Migration System

Migrations live in `src/infrastructure/database/migrations/` and are run in order at startup:

1. `001_steam.ts` — Legacy: steam_users, playtime_history (kept for upgrade path; tables are dropped by 005)
2. `002_notifications.ts` — Legacy: notification_settings, user_notification_prefs, game_activity_cache (dropped by 005)
3. `003_settings.ts` — guild_settings, audit_logs
4. `004_notification.ts` — notification_channels, voice_sessions
5. `005_drop_steam.ts` — Drops the legacy Steam tables created by 001 and 002 on existing databases
6. `006_polls.ts` — polls, poll_votes
7. `007_voice_autojoin.ts` — voice_autojoin_exclusions, plus `guild_settings.voice_autojoin_enabled`
8. `008_poll_ended.ts` — `polls.ended` for durable finalization across restarts

`initializeDatabase()` runs all migrations inside a single transaction. It is safe to call multiple times; migrations use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DROP TABLE IF EXISTS`. Initialization is performed once per process.

SQLite has no `ADD COLUMN IF NOT EXISTS`, so migrations that add a column check `PRAGMA table_info` first (see `007_voice_autojoin.ts`) — every migration re-runs on each boot.

### Rollback Policy

Migrations do not define `down()` functions. To roll back schema changes:

1. Create a new migration that reverses the change (e.g. `DROP TABLE` or `DROP COLUMN`).
2. Or restore from a backup taken before the migration.
3. For development, deleting the database file and re-running the bot will re-apply all migrations from scratch.

---

## ER Diagram

```mermaid
erDiagram
    notification_channels {
        text guild_id PK
        text type PK
        text channel_id
        integer enabled
        integer created_at
        integer updated_at
    }

    voice_sessions {
        integer id PK
        text guild_id
        text user_id
        text channel_id
        text channel_name
        integer joined_at
        integer left_at
        integer duration_ms
        integer created_at
    }

    guild_settings {
        text guild_id PK
        text language
        text audit_channel_id
        integer voice_autojoin_enabled
        integer created_at
        integer updated_at
    }

    polls {
        text message_id PK
        text guild_id
        text channel_id
        text creator_id
        text question
        text options
        integer anonymous
        integer ends_at
        text locale
        integer created_at
        integer ended
    }

    poll_votes {
        text message_id PK
        text user_id PK
        integer option_index
        integer voted_at
    }

    voice_autojoin_exclusions {
        text guild_id PK
        text channel_id PK
        integer created_at
    }

    polls ||--o{ poll_votes : "collects"

    audit_logs {
        integer id PK
        text guild_id
        text user_id
        text action
        text target_id
        text details
        integer created_at
    }
```

---

## Retention Policy

Runtime retention is configured with environment variables and enforced by feature cleanup jobs.

- `RECORDING_RETENTION_HOURS` (default: `24`): deletes `.wav` recording files from `data/recordings/`
- `VOICE_SESSION_RETENTION_DAYS` (default: `30`): deletes completed `voice_sessions` rows older than the cutoff
- `AUDIT_LOG_RETENTION_DAYS` (default: `90`): deletes old `audit_logs` rows
- `BACKUP_RETENTION_DAYS` (default: `7`): deletes old backup files

Active or incomplete voice sessions are not deleted by retention cleanup; they are first closed on startup if they were left open by a previous run.

---

## Persistence on Railway

When deploying to Railway, add a **Volume** with Mount Path `/app/data` to prevent data loss on redeployments. This directory may contain:

- The SQLite database
- Backups
- Voice recordings
- Disk buffers

Ensure `DATABASE_PATH` points to a path under `/app/data` (e.g. `data/bot.db` when the project root is `/app`). See [Deployment](deployment.md) for details.

[← Back to README](../README.md)
