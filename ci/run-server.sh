#!/bin/bash
# Container entrypoint that brings up the EWC server in the same shape
# as the local setup: pipe APL commands into `dyalog +s -q`, then
# hold stdin open with `sleep infinity` so demo.Run's wait loop (and
# the underlying EWC Timer) keep cycling. Without the held-open stdin,
# Dyalog blocks on a stdin read after demo.Run returns and the Timer
# never fires — events from the demo menu sit on _EWC.TIMER1 forever.
#
# We mirror the env-var setup from the image's default /entrypoint
# (DYALOG, LD_LIBRARY_PATH, WSPATH, SESSION_FILE) since we're
# replacing it. Probing /opt/mdyalog rather than hard-coding 20.0
# keeps this version-agnostic.

set -e

DYALOG="$(ls -d /opt/mdyalog/*/64/unicode 2>/dev/null | head -1)"
export DYALOG
export LD_LIBRARY_PATH="${DYALOG}:${LD_LIBRARY_PATH}"
export WSPATH="${DYALOG}/ws"
export TERM=dumb
export APL_TEXTINAPLCORE="${APL_TEXTINAPLCORE:-1}"
export TRACE_ON_ERROR=0
export SESSION_FILE="${SESSION_FILE:-$DYALOG/default.dse}"

# Print the banner so the log looks familiar.
cat <<'BANNER'
 _______     __      _      ____   _____
|  __ \ \   / //\   | |    / __ \ / ____|
|_|  | \ \_/ //  \  | |   | |  | | |
     | |\   // /\ \ | |   | |  | | |   _
 ____| | | |/ /  \ \| |___| |__| | |__| |
|_____/  |_/_/    \_\______\____/ \_____|
BANNER

# Feed the APL setup, then hold stdin with a long sleep so dyalog
# stays alive in demo.Run's wait loop.
(cat /scripts/setup-ewc.apl; sleep infinity) | "${DYALOG}/dyalog" +s -q
