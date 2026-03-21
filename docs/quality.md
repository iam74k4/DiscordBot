# Quality Standards

This document describes the quality standards and practices for this Discord bot.

## Architecture

- **Feature-based layout**: Each feature lives under `src/features/<name>/` with clear boundaries.
- **Layer separation**: `commands` → `application` → `repositories` / supporting runtime folders.
- **Runtime folder naming**: Prefer explicit directories such as `integrations`, `jobs`, `tracking`, or `recording`; keep `services` only when a smaller stateful boundary is clearer.
- **Infrastructure isolation**: Database connection, migrations, and transactions live in `src/infrastructure/database/` only. No business logic there.
- **Shared code isolation**: Cross-feature utilities, shared types, and help catalog state live under `src/shared/`.

## Error Handling

- **Always use `getErrorMessage(error)`** for logging and user-facing error messages. Do not use `error.message` directly; `error` may not be an `Error` instance.
- Always wrap command/event handlers in try-catch.
- For Discord interactions: check `interaction.replied` and `interaction.deferred` before calling `reply()` to avoid "Already replied" errors.
- Use `error instanceof Error ? error.message : String(error)` when `getErrorMessage` is not available.

## Input Validation

- Validate all user inputs (modal, options, text).
- Trim strings and enforce length limits (e.g. GitHub title ≤ 256 characters).
- Reject empty required fields with clear error messages.

## API Integration

- Handle JSON parse errors explicitly (don't rely on `response.json()` alone).
- Use retry logic for transient failures (rate limits, 5xx).
- Validate API responses when structure matters.

## Shutdown

- Run final backup before shutdown when `SHUTDOWN_FINAL_BACKUP` is enabled.
- Configurable shutdown timeout via `SHUTDOWN_TIMEOUT_MS`.
- Graceful shutdown order: Backup → Features → Cooldown store → Database → Client.

## Security

- Use prepared statements for all SQL.
- Validate backup filenames and paths to prevent traversal.
- Require HTTPS for `ALERT_WEBHOOK_URL`.

## Dependencies and `npm audit`

- Run `npm audit` (full tree) and `npm audit --omit=dev --audit-level=high` (matches CI) regularly or before releases.
- **One-shot diagnosis**: `./scripts/audit-all.sh` runs both audits in order; use before releases and paste the terminal output into a PR or issue (do not commit generated audit JSON/HTML reports to the repo).
- **`package.json` overrides**: Some patched versions are pinned via `overrides` (e.g. `undici`, `flatted`) when upstream packages have not yet adopted a fixed release. Revisit after dependency upgrades: try removing an override and run `npm install` + audit; restore the override if advisories return. **Last check**: with overrides removed, `npm audit` reported high-severity `undici` issues via `discord.js` / `@discordjs/rest`; keep both overrides until upstream resolves the nested `undici` version.
- **Dependabot**: Review weekly PRs for `npm` and `github-actions`. Action bumps use commit SHA pins—merge security-related updates promptly.
- **Code scanning**: The repository includes a GitHub Actions CodeQL workflow (`javascript-typescript`) on `main` / `develop`; fix or suppress findings per GitHub’s guidance.
- **Voice / Opus**: The bot depends on `opusscript` for Opus decode used by `prism-media` in voice recording. This avoids native `@discordjs/opus` / `node-pre-gyp` / `tar` install paths that previously tripped high-severity audits. Trade-off: higher CPU than native bindings when many users speak simultaneously; acceptable for typical bot workloads.

## Testing

- Colocate tests with features in `__tests__/`.
- Shared and infrastructure code may also colocate tests under their own `__tests__/` directories.
- Use `getErrorMessage` pattern in mocks.
- Integration tests for backup, admin commands.

## Localization

- Use `t(key, locale, params?)` for all user-facing text.
- Add translations to both `en.ts` and `ja.ts` when adding new keys.

[← Back to README](../README.md)
