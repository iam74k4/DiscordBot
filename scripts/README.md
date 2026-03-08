# Scripts

Repository workflow scripts at project root.

| Script        | Description                                   |
| ------------- | --------------------------------------------- |
| `validate.sh` | Run format, lint, type-check, test, and build |
| `pre-push.sh` | Validation for git pre-push hook              |

## Pre-push hook

To run validation before each push:

```bash
cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

`pre-push.sh` resolves the repository root with `git rev-parse --show-toplevel` and then runs `scripts/validate.sh`, so the copy-based install works from `.git/hooks/pre-push`.
