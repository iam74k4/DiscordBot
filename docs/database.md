# Database

The bot uses SQLite (via `better-sqlite3`) for data persistence. The database file is stored at `data/bot.db`.

Feature code should prefer feature-local repositories under `src/features/<feature>/repositories/` instead of importing shared database modules directly. `src/services/database/` is reserved for DB bootstrap and shared primitives.

## Tables

| Table                     | Description                               |
| ------------------------- | ----------------------------------------- |
| `steam_users`             | Discord-Steam account links               |
| `playtime_history`        | Historical playtime records               |
| `notification_settings`   | Server notification settings              |
| `user_notification_prefs` | User notification preferences             |
| `game_activity_cache`     | Game activity tracking                    |
| `guild_settings`          | Server settings (language, audit channel) |
| `audit_logs`              | Audit log entries                         |

## Persistence on Railway

When deploying to Railway, add a Volume with Mount Path `/app/data` to prevent data loss on redeployments. This directory may contain the database, backups, voice recordings, and disk buffers. See [Deployment](deployment.md) for details.

[← Back to README](../README.md)
