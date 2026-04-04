#!/usr/bin/env bash
# Runs npm audits used for vulnerability diagnosis (see docs/quality.md).
set -euo pipefail

echo "=== Production dependencies (matches CI: high+, omit dev) ==="
npm audit --omit=dev --audit-level=high

echo ""
echo "=== Full dependency tree (includes devDependencies) ==="
npm audit

echo ""
echo "All audits completed. Paste this output into a PR or issue when reporting a security review."
