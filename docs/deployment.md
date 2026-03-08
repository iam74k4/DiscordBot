# Deployment

## Railway (Recommended)

This bot can be deployed to [Railway](https://railway.app/) with automatic deployments from the `main` branch.

### 1. Create Railway Project

1. Go to [Railway](https://railway.app/) and sign up/login
2. Click "New Project" > "Deploy from GitHub repo"
3. Select this repository
4. Railway will automatically detect the Node.js project

### 2. Configure Volume (Required for SQLite and file data)

The bot stores SQLite data under `/app/data`, and the same volume may also contain backups, voice recordings, and disk buffers. To prevent data loss on redeployments:

1. In your Railway project, go to the service
2. Click "Settings" > "Volumes"
3. Add a new volume:
   - Mount Path: `/app/data`
   - Size: 1GB (sufficient for most use cases)

### 3. Set Environment Variables

In Railway dashboard, add the following variables:

| Variable                        | Description                                            | Required                      |
| ------------------------------- | ------------------------------------------------------ | ----------------------------- |
| `DISCORD_TOKEN`                 | Discord bot token                                      | Yes                           |
| `DISCORD_CLIENT_ID`             | Discord application client ID                          | Yes                           |
| `STEAM_API_KEY`                 | Steam Web API key                                      | No (Steam commands need this) |
| `BOT_OWNER_IDS`                 | Bot owner Discord IDs (comma-separated)                | No                            |
| `NODE_ENV`                      | Set to `production`                                    | No                            |
| `MAX_RECORDING_DURATION`        | Max recording time in seconds (default: 300)           | No                            |
| `AUDIO_BUFFER_DURATION`         | Audio buffer time in seconds (default: 600)            | No                            |
| `AUDIO_MEMORY_BUFFER_DURATION`  | Memory buffer time in seconds (default: 120)           | No                            |
| `MAX_CONCURRENT_VC_CONNECTIONS` | Max concurrent VC connections (default: 5)             | No                            |
| `BACKUP_RETENTION_DAYS`         | Days to keep backups (default: 7)                      | No                            |
| `BACKUP_CRON`                   | Backup schedule cron expression (default: `0 4 * * *`) | No                            |
| `ALERT_WEBHOOK_URL`             | Discord webhook URL for alerts                         | No                            |

### 4. Enable Wait for CI (Recommended)

To ensure deployments only proceed after CI passes (lint, test, build):

1. In your Railway project, go to the service
2. Click **Settings** → **Source**
3. Enable **Wait for CI**

When enabled, Railway waits for GitHub Actions to complete successfully before deploying. Failed CI will skip the deployment.

### 5. Deploy

Railway will automatically deploy when you push to the `main` branch.

### Estimated Cost

| Item         | Monthly Cost |
| ------------ | ------------ |
| Hobby Plan   | $5           |
| Volume (1GB) | ~$0.25       |
| **Total**    | **~$5.25**   |

## CI/CD

- **GitHub Actions**: Lint, type-check, test, build on PR/push to main/develop
- **Release**: Push tag `v*` to create GitHub Release with build artifacts
- **Branch strategy**: `feature/*` → `develop` → `main`

[← Back to README](../README.md)
