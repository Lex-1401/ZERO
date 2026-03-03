#!/bin/bash
# Fix rust-core/index.d.ts to be recognized as an ESM module by TypeScript
# This script appends 'export {};' to index.d.ts if not already present

set -e

DTSFILE="${1:-rust-core/index.d.ts}"

if [ -f "$DTSFILE" ]; then
    if ! grep -q '^export {};$' "$DTSFILE" 2>/dev/null; then
        echo "" >> "$DTSFILE"
        echo "export {};" >> "$DTSFILE"
        echo "Fixed: Added ESM module marker to $DTSFILE"
    else
        echo "OK: $DTSFILE already has ESM module marker"
    fi
else
    echo "Warning: $DTSFILE not found"
fi
