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

# EWC_SRC=... overrides the default sibling `ewc` directory (worktree pairs).
EWC_SRC="${EWC_SRC:-$PWD/../ewc}"
if [ ! -d "$EWC_SRC" ]; then
    echo "ERROR: EWC source not found at $EWC_SRC" >&2
    echo "       Set EWC_SRC=/path/to/ewc to override." >&2
    exit 1
fi

# Warn if the user hasn't built ewc-client recently — without dist/,
# EWC's JSClientFolder auto-discovery falls back to the bundled
# `<repo>/client/dist/` inside Dyalog/ewc, which means visual
# regression would capture the wrong (stale) UI.
if [ ! -d dist ]; then
    echo "WARNING: dist/ is missing. EWC will fall back to the bundled" >&2
    echo "         client in Dyalog/ewc, not your local changes."     >&2
    echo "         Run 'yarn build' first if you're testing UI work." >&2
    echo                                                              >&2
fi

# Nuke any prior container with the same name. Suppress the error if
# none exists.
docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d --name "$NAME" \
  -e RIDE_INIT='SERVE:*:4502' \
  -p 4502:4502 \
  -p 22322:22322 \
  --entrypoint /scripts/run-server.sh \
  -v "$EWC_SRC:/work/ewc:ro" \
  -v "$PWD/dist:/work/ewc-client/dist:ro" \
  -v "$PWD/ci:/scripts:ro" \
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
