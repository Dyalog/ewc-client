#!/bin/bash
# Start an `ewc-multi` Docker container running the mtest app in EWC's
# MULTI mode on port 22323 (with RIDE on :4503). Used by:
#
#   yarn ewc-multi:start      # this script
#   yarn multitests           # (assumes server already running)
#   yarn ewc-multi:stop       # docker rm -f ewc-multi
#
# Deliberately a SEPARATE container and port from ewc-demo (:22322,
# RIDE :4502): a Dyalog process runs EWC in exactly one mode, so Multi
# mode cannot share the Browser-mode server. Distinct ports mean both
# suites can run concurrently without tearing each other down.

set -e

NAME="ewc-multi"
PORT=22323
RIDE_PORT=4503

# EWC_SRC=... overrides the default sibling `ewc` directory (worktree pairs).
EWC_SRC="${EWC_SRC:-$PWD/../ewc}"
if [ ! -d "$EWC_SRC" ]; then
    echo "ERROR: EWC source not found at $EWC_SRC" >&2
    echo "       Set EWC_SRC=/path/to/ewc to override." >&2
    exit 1
fi

# Without dist/, EWC's JSClientFolder auto-discovery falls back to the
# bundled client inside Dyalog/ewc — i.e. not your local changes.
if [ ! -d dist ]; then
    echo "WARNING: dist/ is missing. EWC will fall back to the bundled" >&2
    echo "         client in Dyalog/ewc, not your local changes."     >&2
    echo "         Run 'yarn build' first if you're testing UI work." >&2
    echo                                                              >&2
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true

# The mtest app mounts at /work/mtest (NOT /work — that would shadow
# /work/ewc and /work/ewc-client). ]link.create names the namespace after
# the directory, so the mount point has to be called `mtest`.
docker run -d --name "$NAME" \
  -e RIDE_INIT="SERVE:*:${RIDE_PORT}" \
  -e SETUP_APL=/scripts/setup-ewc-multi.apl \
  -p "${RIDE_PORT}:${RIDE_PORT}" \
  -p "${PORT}:${PORT}" \
  --entrypoint /scripts/run-server.sh \
  -v "$EWC_SRC:/work/ewc:ro" \
  -v "$PWD/dist:/work/ewc-client/dist:ro" \
  -v "$PWD/e2e/multi/apl/mtest:/work/mtest:ro" \
  -v "$PWD/ci:/scripts:ro" \
  dyalog/dyalog:latest >/dev/null

echo "Starting EWC Multi server (waiting for :${PORT})..."

# A listening TCP socket isn't enough — the WSS binds a moment before it
# can serve. curl GET / (not HEAD: EWC's WSS only handles GET).
for i in $(seq 1 60); do
    if curl -sf -o /dev/null "http://localhost:${PORT}/" 2>/dev/null; then
        echo "EWC Multi server ready: http://localhost:${PORT}  (RIDE: :${RIDE_PORT})"
        exit 0
    fi
    sleep 1
done

echo "ERROR: EWC Multi server did not come up within 60 seconds." >&2
echo "Container logs:" >&2
docker logs "$NAME" >&2 || true
exit 1
