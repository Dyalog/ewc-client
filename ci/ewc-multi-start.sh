#!/bin/bash
# Start an `ewc-multi` Docker container running the multitest app in EWC's
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

# The APL server lives in this repo now. EWC_SRC=... still overrides it,
# for running Multi against a different checkout or worktree.
EWC_SRC="${EWC_SRC:-$PWD}"
if [ ! -d "$EWC_SRC/EWC" ]; then
    echo "ERROR: no EWC/ directory at $EWC_SRC" >&2
    echo "       Run this from the repo root, or set EWC_SRC=/path/to/ewc." >&2
    exit 1
fi

# The test app lives in Dyalog/ewc, so an EWC checkout predating it would
# otherwise fail deep inside APL with a VALUE ERROR on multitest.Run.
if [ ! -d "$EWC_SRC/test-apps/multitest" ]; then
    echo "ERROR: $EWC_SRC has no test-apps/multitest." >&2
    echo "       The Multi-mode test app lives in Dyalog/ewc; this checkout" >&2
    echo "       predates it. Update it, or point EWC_SRC at one that has it." >&2
    exit 1
fi

# client/dist is no longer committed, so a missing build is fatal rather
# than a silent fall-back to a stale bundled copy.
if [ ! -d "$EWC_SRC/client/dist" ]; then
    echo "ERROR: client/dist is missing — the server has no client to serve." >&2
    echo "       Run 'yarn build' from the repo root first."                  >&2
    exit 1
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true

# The test app rides along inside the ewc mount, at
# /work/ewc/test-apps/multitest — so EWC_SRC swaps the backend and the
# fixture app together.
docker run -d --name "$NAME" \
  -e RIDE_INIT="SERVE:*:${RIDE_PORT}" \
  -e SETUP_APL=/work/ewc/ci/setup-ewc-multi.apl \
  -p "${RIDE_PORT}:${RIDE_PORT}" \
  -p "${PORT}:${PORT}" \
  --entrypoint /work/ewc/ci/run-server.sh \
  -v "$EWC_SRC:/work/ewc:ro" \
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
