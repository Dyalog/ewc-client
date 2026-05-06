⍝ Boot the EWC demo server inside a Dyalog APL container.
⍝
⍝ Expected mounts:
⍝   /ewc      → the Dyalog/ewc repo (cloned by the CI workflow)
⍝   /scripts  → this script's directory
⍝
⍝ The browser-served React client (ewc-client) connects to port 22322,
⍝ so this script must keep Dyalog alive once the server is up — otherwise
⍝ the container exits and the WebSocket dies (same constraint as the
⍝ local gritt + sleep-infinity pattern).

]link.create /ewc/EWC
]link.create /ewc/demo
EWC.FOLDER←'/ewc/EWC'
1 demo.Run 'Browser'
⎕←'EWC server ready'

⍝ Keep Dyalog alive. Tests take ~3–5 min; ⎕DL ticks every 60 s and
⍝ the :Repeat/:Until 0 loop runs forever.
:Repeat
    ⎕DL 60
:Until 0
