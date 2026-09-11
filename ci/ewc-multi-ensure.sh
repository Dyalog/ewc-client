#!/bin/bash
# Make sure a Multi-mode EWC server is answering on :22323, starting one only
# if it isn't. Cheap when the server is already warm, which matters for the
# interactive paths (yarn multitests:watch, yarn ewc-multi:observe) where you
# re-run repeatedly and don't want a container rebuild each time.
#
# ewc-multi-start.sh always destroys and recreates; this doesn't.

set -e

PORT="${MULTI_PORT:-22323}"

if curl -sf -o /dev/null --max-time 3 "http://localhost:${PORT}/" 2>/dev/null; then
    echo "EWC Multi server already running on :${PORT}"
    exit 0
fi

echo "No EWC Multi server on :${PORT} — starting one…"
exec bash "$(dirname "$0")/ewc-multi-start.sh"
