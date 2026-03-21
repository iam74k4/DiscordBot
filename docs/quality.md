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

## Testing

- Colocate tests with features in `__tests__/`.
- Shared and infrastructure code may also colocate tests under their own `__tests__/` directories.
- Use `getErrorMessage` pattern in mocks.
- Integration tests for backup, admin commands.

## Localization

- Use `t(key, locale, params?)` for all user-facing text.
- Add translations to both `en.ts` and `ja.ts` when adding new keys.

[← Back to README](../README.md)
