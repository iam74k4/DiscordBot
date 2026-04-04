# Deployment

## Railway (Recommended)

Production should **not** auto-deploy from `develop`. Use **`main` only** for Railway production deploys, and create **version tags** (`v*`) after the `main` commit is ready so GitHub Releases match what was shipped.

### 1. Create Railway Project

1. Go to [Railway](https://railway.app/) and sign up/login
2. Click "New Project" > "Deploy from GitHub repo"
3. Select this repository
4. Railway will automatically detect the Node.js project
5. Open the service **Settings** → **Source** and set the **trigger branch** to **`main`** (never `develop` for production)

### 2. Configure Volume (Required for SQLite and file data)

The bot stores SQLite data under `/app/data`, and the same volume may also contain backups, voice recordings, and disk buffers. To prevent data loss on redeployments:

1. In your Railway project, go to the service
2. Click "Settings" > "Volumes"
3. Add a new volume:
   - Mount Path: `/app/data`
   - Size: 1GB (sufficient for most use cases)

### 3. Set Environment Variables

In Railway dashboard, add the following variables:

| Variable                          | Description                                                                      | Required                      |
| --------------------------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| `DISCORD_TOKEN`                   | Discord bot token                                                                | Yes                           |
| `DISCORD_CLIENT_ID`               | Discord application client ID                                                    | Yes                           |
| `STEAM_API_KEY`                   | Steam Web API key                                                                | No (Steam commands need this) |
| `STEAM_RANKING_BATCH_SIZE`        | Steam ranking API batch size (1–20, default: 8)                                  | No                            |
| `GITHUB_TOKEN`                    | GitHub Personal Access Token for `/github` commands                              | No                            |
| `GITHUB_ALLOWED_REPOS`            | Comma-separated `owner/name` allowlist for non-owner `/github` access            | No                            |
| `BOT_OWNER_IDS`                   | Bot owner Discord IDs (comma-separated); **required when `NODE_ENV=production`** | Yes in production             |
| `DISCORD_GUILD_ID`                | Development guild for faster slash command updates                               | No                            |
| `NODE_ENV`                        | Set to `production`                                                              | No                            |
| `TZ`                              | Timezone used by cron jobs and timestamps                                        | No                            |
| `MAX_RECORDING_DURATION`          | Max recording time in seconds (default: 300)                                     | No                            |
| `AUDIO_BUFFER_DURATION`           | Audio buffer time in seconds (default: 600)                                      | No                            |
| `AUDIO_MEMORY_BUFFER_DURATION`    | Memory buffer time in seconds (default: 120)                                     | No                            |
| `MAX_CONCURRENT_VC_CONNECTIONS`   | Max concurrent VC connections (default: 5)                                       | No                            |
| `RECORDING_RETENTION_HOURS`       | Hours to keep generated recording files (default: 24)                            | No                            |
| `PLAYTIME_HISTORY_RETENTION_DAYS` | Days to keep Steam playtime history (default: 365)                               | No                            |
| `VOICE_SESSION_RETENTION_DAYS`    | Days to keep completed VC session records (default: 30)                          | No                            |
| `AUDIT_LOG_RETENTION_DAYS`        | Days to keep audit logs (default: 90)                                            | No                            |
| `BACKUP_RETENTION_DAYS`           | Days to keep backups (default: 7)                                                | No                            |
| `BACKUP_CRON`                     | Backup schedule cron expression (default: `0 4 * * *`)                           | No                            |
| `SHUTDOWN_FINAL_BACKUP`           | Run final backup before shutdown (default: true)                                 | No                            |
| `SHUTDOWN_TIMEOUT_MS`             | Shutdown timeout in ms (default: 10000, range: 5000–120000)                      | No                            |
| `ALERT_WEBHOOK_URL`               | Discord webhook URL for alerts (`https://` only)                                 | No                            |
| `LOG_LEVEL`                       | Log level: debug, info, warn, error                                              | No                            |
| `DATA_DIR`                        | Base directory for persisted runtime data (must stay relative to repo root)      | No                            |
| `DATABASE_PATH`                   | SQLite database path (must stay relative to repo root)                           | No                            |
| `RECORDINGS_DIR`                  | Generated recording files directory (must stay relative to repo root)            | No                            |
| `AUDIO_DISK_BUFFER_DIR`           | On-disk audio buffer directory (must stay relative to repo root)                 | No                            |
| `BACKUP_DIR`                      | Backup output directory (must stay relative to repo root)                        | No                            |

If you enable voice recording in production, remember that `/voice record` now requires `Manage Server`, and generated files are delivered ephemerally and cleaned up automatically according to `RECORDING_RETENTION_HOURS`.

If you enable GitHub integration, prefer a least-privilege token and scope it only to the repositories that should be managed by the bot. By default `/github` is bot-owner only; if you want `Manage Server` users to use it, set `GITHUB_ALLOWED_REPOS` and keep the token limited to that allowlist.

### 4. Choose how production deploys run

**Recommended:** Keep the Railway service connected to GitHub, restrict the trigger branch to **`main`**, and let Railway deploy only after the `main` branch passes CI.

1. In the service **Settings** → **Source**, keep the GitHub repository connected.
2. Set the trigger branch to **`main`** so `develop` never deploys to production.
3. Push version tags (for example `v1.2.3`) only after the `main` commit is ready. The Release workflow builds and publishes GitHub Release artifacts, while Railway deployment continues to come from the `main` branch integration.

If you prefer manual production deploys, disconnect GitHub autodeploys and trigger Railway deployments manually from the Railway dashboard. In that mode, the Release workflow still creates artifacts but does not deploy anything by itself.

### 5. Enable Wait for CI (optional, GitHub-connected services only)

If the service stays connected to GitHub and deploys from **`main`**, you can wait for Actions to pass first:

1. In your Railway project, go to the service
2. Click **Settings** → **Source**
3. Enable **Wait for CI**

Railway’s “Wait for CI” expects a workflow that runs on `push` to `main` (this repository’s CI includes that). Failed CI will skip the deployment.

### Estimated Cost

| Item         | Monthly Cost |
| ------------ | ------------ |
| Hobby Plan   | $5           |
| Volume (1GB) | ~$0.25       |
| **Total**    | **~$5.25**   |

## CI/CD

- **GitHub Actions**: Lint, format-check, type-check, test, production dependency audit, and build on PR/push to `main` and `develop`
- **CodeQL**: JavaScript/TypeScript analysis on `main` / `develop` (plus weekly schedule); review alerts under **Security → Code scanning**
- **Release**: Push tag `v*` to create a GitHub Release with build artifacts; Railway deployment is intentionally handled outside the release workflow
- **Branch strategy**: `feature/*` or `fix/*` → `main` (or merge via `develop` if your team uses it; either way CI runs on both default integration branches above). **Production Railway** should track **`main`** only, not `develop`.
- **Runtime**: CI and release workflows run on Node.js `22.12.0`
- **Local parity**: Run `./scripts/validate.sh` before push — it mirrors CI checks including `npm audit --omit=dev --audit-level=high`

[← Back to README](../README.md)
