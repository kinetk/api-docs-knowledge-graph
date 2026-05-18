#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="${GRAPH_SERVICE_DIR:-$SCRIPT_DIR/../../../serverless/ip-knowledge-graph/graph-service}/openapi/openapi.yaml"
DEST="$SCRIPT_DIR/../fern/openapi/openapi.yaml"

if [ ! -f "$SRC" ]; then
  echo "Source spec not found: $SRC"
  echo "Override with GRAPH_SERVICE_DIR=/path/to/graph-service if it lives elsewhere."
  exit 1
fi

cp "$SRC" "$DEST"
echo "Synced $SRC -> $DEST"
