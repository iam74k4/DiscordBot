#!/usr/bin/env bash
# Pre-push hook: run validation before pushing.
# Install: cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
set -e

repo_root="$(git rev-parse --show-toplevel)"

echo "Running pre-push validation..."
"$repo_root/scripts/validate.sh"
