#!/bin/bash
# Start an `ewc-demo` Docker container running the EWC demo on
# port 22322 (with RIDE on :4502 for development). Used by:
#
#   yarn ewc-demo:start       # this script
#   yarn demotests:visual       # (assumes server already running)
#   yarn demotests:visual:update
#   yarn ewc-demo:stop        # docker rm -f ewc-demo
#
# Always nukes any pre-existing container with the same name (so we
# don't accumulate "Unable to create more than 100 sessions" cap
# limits across long sessions), then waits until :22322 actually
# accepts connections before returning. The very next yarn command
# can run tests immediately without racing the server.

set -e

NAME="ewc-demo"

# The APL server lives in this repo now. EWC_SRC=... still overrides it,
# for running the demo against a different checkout or worktree.
EWC_SRC="${EWC_SRC:-$PWD}"
if [ ! -d "$EWC_SRC/EWC" ]; then
    echo "ERROR: no EWC/ directory at $EWC_SRC" >&2
    echo "       Run this from the repo root, or set EWC_SRC=/path/to/ewc." >&2
    exit 1
fi

# client/dist is no longer committed, so a missing build is fatal rather
# than a silent fall-back to a stale bundled copy.
if [ ! -d "$EWC_SRC/client/dist" ]; then
    echo "ERROR: client/dist is missing — the server has no client to serve." >&2
    echo "       Run 'yarn build' from the repo root first."                  >&2
    exit 1
fi

# Nuke any prior container with the same name. Suppress the error if
# none exists.
docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d --name "$NAME" \
  -e RIDE_INIT='SERVE:*:4502' \
  -p 4502:4502 \
  -p 22322:22322 \
  --entrypoint /work/ewc/ci/run-server.sh \
  -v "$EWC_SRC:/work/ewc:ro" \
  dyalog/dyalog:latest >/dev/null

echo "Starting EWC server (waiting for :22322)..."

# Wait until the EWC server actually serves HTTP — a TCP-listening
# socket isn't enough because the WSS finishes binding a moment
# before it's ready to handle requests. We curl GET / (not HEAD —
# EWC's WSS only handles GET) and require a 200 response.
for i in $(seq 1 60); do
    if curl -sf -o /dev/null http://localhost:22322/ 2>/dev/null; then
        echo "EWC server ready: http://localhost:22322  (RIDE: :4502)"
        exit 0
    fi
    sleep 1
done

echo "ERROR: EWC server did not come up within 60 seconds." >&2
echo "Container logs:" >&2
docker logs "$NAME" >&2 || true
exit 1
