# Contributing

## Getting Started

1. Fork the repository
2. Clone your fork and install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in required values
4. Run the bot in development mode: `npm run dev`

## Branch Naming

- `feature/<name>` or `feat/<name>` — new features
- `fix/<name>` or `bugfix/<name>` — bug fixes
- `docs/<name>` — documentation changes

Branch from `main`, merge back to `main` when ready.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **scope**: optional (e.g. `auth`, `steam`, `voice`)
- **subject**: lowercase, imperative, no period, max 50 chars

Examples:

- `feat(steam): add profile comparison command`
- `fix(voice): handle disconnect during recording`
- `docs: update database schema documentation`

## Code Style

- TypeScript strict mode is enforced
- Run `npm run lint` and `npm run format` before committing
- Run `npm run type-check` to verify types
- Use `scripts/validate.sh` for a full pre-push check

## Adding Features

Features are auto-discovered. Create a directory under `src/features/<name>/`:

```
src/features/<name>/
├── index.ts          # Must export { name, start, stop }
├── commands/         # Slash command definitions (auto-loaded)
├── application/      # Business logic handlers
├── repositories/     # Database access (real SQL queries)
├── __tests__/        # Colocated tests
└── ...               # Optional: integrations/, jobs/, tracking/, recording/, or services/
```

No manual registration in `features/index.ts` is needed.

## Testing

- Colocate tests with features: `features/<name>/__tests__/`
- Use shared helpers from `src/__tests__/helpers/discord.ts`
- Shared utility tests may live under `src/shared/**/__tests__/`
- Infrastructure tests may live under `src/infrastructure/**/__tests__/`
- Run tests: `npm test`
- Run with coverage: `npm run test:coverage`

All PRs should include tests for new functionality.

## Security maintenance

- Run `npm run audit:all` (or `./scripts/audit-all.sh`) before releases; see [`docs/quality.md`](docs/quality.md) for dependency and `overrides` policy.
- **Dependabot**: Review weekly PRs labeled `dependencies` for `npm` and `github-actions`. GitHub Action updates use commit SHA pins—merge security-related bumps promptly.
- **Code scanning**: CodeQL runs on `main` and `develop`; address or triage alerts in the repository **Security** tab.

## Pull Requests

1. Ensure all checks pass: `npm run lint && npm run type-check && npm test`
2. Write a clear PR description explaining the change
3. Reference related issues if applicable
4. Keep PRs focused — one logical change per PR
