#!/usr/bin/env bash
# Regenerate reference docs by running EWC.Doc.Make in Dyalog (one-shot batch).
set -e
DYALOG="$(ls -d /opt/mdyalog/*/64/unicode 2>/dev/null | head -1)"
export DYALOG LD_LIBRARY_PATH="${DYALOG}:${LD_LIBRARY_PATH}" WSPATH="${DYALOG}/ws"
export TERM=dumb APL_TEXTINAPLCORE=1 TRACE_ON_ERROR=0 SESSION_FILE="${DYALOG}/default.dse"
cd /work/ewc   # Make derives the repo root from the working dir when run headless
"${DYALOG}/dyalog" +s -q <<'APL'
]Link.Create #.EWC /work/ewc/EWC
#.EWC.Doc.Make
)OFF
APL
