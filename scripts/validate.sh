#!/usr/bin/env bash
set -e

echo "Running validation (format, lint, type-check, test, build)..."
npm run format:check
npm run lint
npm run type-check
npm run test
npm run build
echo "Validation passed."
